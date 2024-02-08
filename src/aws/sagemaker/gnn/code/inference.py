import random
from tqdm import tqdm
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
import torch
from torch import nn, optim, Tensor

from torch_sparse import SparseTensor, matmul

from torch_geometric.utils import structured_negative_sampling
from torch_geometric.data import download_url, extract_zip
from torch_geometric.nn.conv.gcn_conv import gcn_norm
from torch_geometric.nn.conv import MessagePassing
from torch_geometric.typing import Adj
import boto3
import json
import os
from io import StringIO 
from bertopic import BERTopic
import math

JSON_CONTENT_TYPE = "application/json"
BUCKET_NAME = 'ecc-scraper-data'

class LightGCN(MessagePassing):
    """LightGCN Model as proposed in https://arxiv.org/abs/2002.02126
    """

    def __init__(self, num_users, num_items, edge_user_post, embedding_dim=64, K=3, add_self_loops=False):
        """Initializes LightGCN Model

        Args:
            num_users (int): Number of users
            num_items (int): Number of items
            embedding_dim (int, optional): Dimensionality of embeddings. Defaults to 8.
            K (int, optional): Number of message passing layers. Defaults to 3.
            add_self_loops (bool, optional): Whether to add self loops for message passing. Defaults to False.
        """
        super().__init__()
        self.num_users, self.num_items = num_users, num_items
        self.embedding_dim, self.K = embedding_dim, K
        self.add_self_loops = add_self_loops

        self.users_emb = nn.Embedding(
            num_embeddings=self.num_users, embedding_dim=self.embedding_dim) # e_u^0
        self.items_emb = nn.Embedding(
            num_embeddings=self.num_items, embedding_dim=self.embedding_dim) # e_i^0
        self.edge_user_post = edge_user_post
        
        nn.init.normal_(self.users_emb.weight, std=0.1)
        nn.init.normal_(self.items_emb.weight, std=0.1)

    def forward(self, edge_index: SparseTensor):
        """Forward propagation of LightGCN Model.

        Args:
            edge_index (SparseTensor): adjacency matrix

        Returns:
            tuple (Tensor): e_u_k, e_u_0, e_i_k, e_i_0
        """
        # compute \tilde{A}: symmetrically normalized adjacency matrix
        edge_index_norm = gcn_norm(
            edge_index, add_self_loops=self.add_self_loops)

        emb_0 = torch.cat([self.users_emb.weight, self.items_emb.weight]) # E^0
        embs = [emb_0]
        emb_k = emb_0

        # multi-scale diffusion
        for i in range(self.K):
            emb_k = self.propagate(edge_index_norm, x=emb_k)
            embs.append(emb_k)

        embs = torch.stack(embs, dim=1)
        emb_final = torch.mean(embs, dim=1) # E^K

        users_emb_final, items_emb_final = torch.split(
            emb_final, [self.num_users, self.num_items]) # splits into e_u^K and e_i^K

        # returns e_u^K, e_u^0, e_i^K, e_i^0
        return users_emb_final, self.users_emb.weight, items_emb_final, self.items_emb.weight

    def message(self, x_j: Tensor) -> Tensor:
        return x_j

    def message_and_aggregate(self, adj_t: SparseTensor, x: Tensor) -> Tensor:
        # computes \tilde{A} @ x
        return matmul(adj_t, x)
    
# helper function to get N_u
def get_user_positive_items(edge_index):
    """Generates dictionary of positive items for each user

    Args:
        edge_index (torch.Tensor): 2 by N list of edges

    Returns:
        dict: dictionary of positive items for each user
    """
    user_pos_items = {}
    for i in range(edge_index.shape[1]):
        user = edge_index[0][i].item()
        item = edge_index[1][i].item()
        if user not in user_pos_items:
            user_pos_items[user] = []
        user_pos_items[user].append(item)
    return user_pos_items

def load_node_csv(old_df, index_col):
    """Loads csv containing node information

    Args:
        path (str): path to csv file
        index_col (str): column name of index column

    Returns:
        dict: mapping of csv row to node id
    """
    df = old_df.set_index(index_col)
    mapping = {index: i for i, index in enumerate(df.index.unique())}
    return mapping

def model_fn(model_dir, s3 = boto3.client('s3')):
    objects = s3.list_objects_v2(Bucket=BUCKET_NAME)['Contents']
    objects = list( objects)

    for obj in objects:
        if(obj['Key']=='preprocessed_data.csv'):
            contents = s3.get_object(Bucket=BUCKET_NAME, Key=obj['Key'])
            contents = contents['Body'].read().decode('utf-8')
            df = pd.read_csv(StringIO(contents), index_col=0)
            break

    df.rename( columns={0 :'id'}, inplace=True )
    
    user_mapping = load_node_csv(df, index_col='current_user')
    post_mapping = load_node_csv(df, index_col='post_id')
    author_mapping = load_node_csv(df, index_col='authorUrl')

    postid_text = pd.Series(df.text.values, index=df.post_id).to_dict()
    postid_author = pd.Series(df.author.values, index=df.post_id).to_dict()
    postid_original_user = pd.Series(df.current_user.values, index=df.post_id).to_dict()

    s3.download_file(
        'ecc-model-dump',
        'saved_model.pt', 
        'saved_model.pt'   
    )   
    s3.download_file(
        'ecc-model-dump',
        'bert_topic_model', 
        'bert_topic_model'
    )

    words_list = df['top_words'].dropna().unique().tolist()
    # topic_model = BERTopic.load("bert_topic_model")
    model = torch.load('saved_model.pt', map_location=torch.device('cuda' if torch.cuda.is_available() else 'cpu'))
    
    return (model, words_list, user_mapping, post_mapping, author_mapping, postid_text, postid_author, postid_original_user, df)


def input_fn(serialized_input_data, content_type=JSON_CONTENT_TYPE):
    if content_type == JSON_CONTENT_TYPE:
        input_data = json.loads(serialized_input_data)
        return input_data

    else:
        raise Exception("Requested unsupported ContentType in Accept: " + content_type)


def predict_fn(input_data, d):
    model, words_list = d[0], d[1]
    user_mapping, post_mapping, author_mapping = d[2],  d[3], d[4]

    postid_text, postid_author, postid_original_user = d[5], d[6], d[7]
    
    df = d[8]

    user_id = input_data['current_user']
    num_recs = int(input_data['n_recommendations'])


    if user_id not in user_mapping:
        return {'Error':'User not found'}

    user = user_mapping[user_id]
    
    e_u = model.users_emb.weight[user]
    scores = model.items_emb.weight @ e_u

    user_pos_items = get_user_positive_items(model.edge_user_post)
    
    values, indices = torch.topk(scores, k=len(user_pos_items[user]) + num_recs)

    posts = [index.cpu().item() for index in indices if index in user_pos_items[user]][:num_recs]
    post_ids = [list(post_mapping.keys())[list(post_mapping.values()).index(post)] for post in posts]
    liked_cleaned_posts = df[df['post_id'].isin(post_ids)]
    
    if len(posts) == 0 or len(post_ids) == 0:
        return {'Error':'No recommendations yet'}
    
    texts = [postid_text[id] for id in post_ids]
    authors =  [postid_author[id] for id in post_ids]
    original_users = [postid_original_user[id] for id in post_ids]
    
    data = {}
    data['user'] = user_id
    

    # stores liked and recommended posts
    data['liked_posts'] = []
    data['recom_posts'] = []
    # data['words_all'] = str(words_list)

    data['liked_topics'] = []
    data['recom_topics'] = []

    for i in range(len(post_ids)):
        stat = liked_cleaned_posts.iloc[i]
        
        data['liked_posts'].append(
            {
                'author': authors[i],
                'original_user': original_users[i],
                'post_id': f"https://www.linkedin.com/feed/update/{post_ids[i]}/",
                'post_body': texts[i],
                'top_words': stat['top_words'],
                'topic': stat['topic_name']
            }
        )
        if type(stat['top_words']) is not float:
            for word in stat['top_words'].split(' - '):
                data['liked_topics'].append(word)

    posts = [index.cpu().item() for index in indices if index not in user_pos_items[user]][:num_recs]
    post_ids = [list(post_mapping.keys())[list(post_mapping.values()).index(post)] for post in posts]
    texts = [postid_text[id] for id in post_ids]
    authors =  [postid_author[id] for id in post_ids]
    original_users = [postid_original_user[id] for id in post_ids]
    
    reco_cleaned_posts = df[df['post_id'].isin(post_ids)]
    
    for i in range(len(post_ids)):
        stat = reco_cleaned_posts.iloc[i]
        data['recom_posts'].append(
            {
                'author': authors[i],
                'original_user': original_users[i],
                'post_id': f"https://www.linkedin.com/feed/update/{post_ids[i]}/",
                'post_body': texts[i],
                'top_words': stat['top_words'],
                'topic': stat['topic_name']
            }
        )
        
        if type(stat['top_words']) is not float:
            for word in stat['top_words'].split(' - '):
                data['recom_topics'].append(word)
    
    
    return data


def output_fn(prediction_output, accept=JSON_CONTENT_TYPE):
    if accept == JSON_CONTENT_TYPE:
        return json.dumps(prediction_output), accept

    raise Exception("Requested unsupported ContentType being accepted: " + accept)