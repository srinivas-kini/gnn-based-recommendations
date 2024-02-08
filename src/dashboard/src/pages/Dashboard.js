import React from "react";
import adminLayout from "../hoc/adminLayout";
import { Preloader, Bars } from "react-preloader-icon";
import { Card } from "react-bootstrap";
import { getChatResponse } from "./api/generate";
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { DUMMY_RESPONSE } from "./api/query";
import Form from 'react-bootstrap/Form';
import Button from "react-bootstrap/Button";


const Loader = () => {
  return (
    <div className="loading-page">
      <div className="center">
        <Preloader
          use={Bars}
          size={60}
          strokeWidth={10}
          strokeColor="#f7b085"
          duration={600}
        />
      </div>
    </div>
  );
};


class Dashboard extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      initial: true,
      blogs: [],
      researchPapers: [],
      githubLinks: [],
      videos: [],
    };
  }

  async componentDidMount() {
    this.setState({
      blogs: undefined,
      researchPapers: undefined,
      githubLinks: undefined,
      videos: undefined,
      likedPosts: undefined,
      recomPosts: undefined,
      wordCloudData: undefined
    });
    this.fetchPosts = this.fetchPosts.bind(this);
  }

  async fetchPosts(event) {

    event.preventDefault();

    this.setState({
      loading: true
    })

    const requestBody = {
      "current_user": event.target[0].value,
      "n_recommendations": event.target[1].value
    }
    console.log(requestBody);

    var headers = new Headers();
    headers.append("Content-Type", "application/json");

    // let response = JSON.parse(DUMMY_RESPONSE);
    let response = await fetch(process.env.REACT_APP_EC2_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    })
    response = await response.json();

    console.log(response);
    console.log("Calling OpenAI...")

    let chatResponse = await getChatResponse(response.liked_topics.sort(() => Math.random() - Math.random()).slice(0, 3));
    console.log(chatResponse);
    chatResponse = JSON.parse(chatResponse.body);
    console.log(chatResponse);

    this.setState({
      blogs: chatResponse.blogs || chatResponse.mediumBlogs,
      researchPapers: chatResponse.researchPapers,
      githubLinks: chatResponse.githubLinks || chatResponse.github,
      videos: chatResponse.videos,
      likedPosts: response.liked_posts,
      recomPosts: response.recom_posts,
      wordCloudData: []
    });

    this.setState({
      loading: false,
      initial: false
    });

  }

  render() {

    return this.state.loading ? <Loader /> : (

      <React.Fragment>

        <Container>

          <Row>
            <Form onSubmit={this.fetchPosts}>
              <Form.Group className="mb-3" controlId="formBasicEmail">
                <Form.Label>LinkedIn Username</Form.Label>
                <Form.Control type="text" placeholder="Enter your LinkedIn username" />
              </Form.Group>

              <Form.Group className="mb-3" controlId="formBasicNRecs">
                <Form.Label># Recommendations</Form.Label>
                <Form.Control type="text" placeholder="How many recommendations would you like?" />
              </Form.Group>


              <Button variant="primary" type="submit">
                Get Recommendations
              </Button>
            </Form>

          </Row>

          <br />
          <br />

          {!this.state.initial && <React.Fragment>
            <Row>
              <Col>
                <Card border="danger">
                  <Card.Img variant="top" src="https://contenthub-static.grammarly.com/blog/wp-content/uploads/2023/03/What-is-a-cover-letter-1-1.png"></Card.Img>
                  <Card.Header>Posts to Revisit</Card.Header>
                  <Card.Body>
                    {
                      this.state.likedPosts ?

                        this.state.likedPosts.map((post) => {
                          return (
                            <React.Fragment>
                              <Card.Title>
                                <a href={post.post_id} target="_blank">{post.author}</a>
                              </Card.Title>
                              <Card.Body>
                                {post.post_body.substring(0, 100) + "..."}
                              </Card.Body>
                            </React.Fragment>
                          )
                        })

                        : undefined
                    }
                  </Card.Body>
                </Card>
              </Col>


              <Col>
                <Card border="primary">
                  <Card.Img variant="top" src="https://contenthub-static.grammarly.com/blog/wp-content/uploads/2023/03/BMD-4290.png"></Card.Img>
                  <Card.Header>Cross Recommended Posts</Card.Header>
                  <Card.Body>
                    {
                      this.state.recomPosts ?

                        this.state.recomPosts.map((post) => {
                          return (
                            <React.Fragment>
                              <Card.Title>
                                <a href={post.post_id} target="_blank">{post.author}</a>
                              </Card.Title>
                              <Card.Body>
                                {post.post_body.substring(0, 100) + "..."}
                              </Card.Body>
                            </React.Fragment>
                          )
                        })

                        : undefined
                    }
                  </Card.Body>
                </Card>
              </Col>


            </Row>


            <br />
            <br />


            <Row>
              <Col>
                <Card border="primary">
                  <Card.Img variant="top" src="https://contenthub-static.grammarly.com/blog/wp-content/uploads/2017/11/how-to-write-a-blog-post.jpeg"></Card.Img>
                  <Card.Header>Blogs</Card.Header>
                  <Card.Body>

                    {
                      this.state.blogs ?

                        this.state.blogs.map((blog) => {
                          return (
                            <Card.Title>
                              <a href={blog.url} target="_blank">{blog.title}</a>
                            </Card.Title>
                          )
                        })

                        : undefined
                    }
                  </Card.Body>
                </Card>
              </Col>

              <Col>
                <Card border="success">
                  <Card.Img variant="top" src="https://contenthub-static.grammarly.com/blog/wp-content/uploads/2022/02/Effective-Research-Paper.jpg"></Card.Img>
                  <Card.Header>Research Papers</Card.Header>
                  <Card.Body>

                    {
                      this.state.researchPapers ?

                        this.state.researchPapers.map((paper) => {
                          return (
                            <Card.Title>
                              <a href={paper.url} target="_blank">{paper.title}</a>
                            </Card.Title>
                          )
                        })

                        : undefined
                    }
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <br />
            <br />

            <Row>
              <Col>
                <Card border="dark">
                  <Card.Img variant="top" src="https://contenthub-static.grammarly.com/blog/wp-content/uploads/2021/04/simplified-grammarly-editor-experience.jpeg"></Card.Img>
                  <Card.Header>Videos</Card.Header>
                  <Card.Body>

                    {
                      this.state.videos ?

                        this.state.videos.map((video) => {
                          return (
                            <Card.Title color="#0468D8">
                              <a href={video.url} target="_blank">{video.title}</a>
                            </Card.Title>
                          )
                        })

                        : undefined
                    }
                  </Card.Body>
                </Card>
              </Col>

              <Col>
                <Card border="warning">
                  <Card.Img variant="top" src="https://contenthub-static.grammarly.com/blog/wp-content/uploads/2021/12/2125-Operation-Transformation-Blog-Header-v2.png"></Card.Img>
                  <Card.Header>Github Repositories</Card.Header>
                  <Card.Body>

                    {
                      this.state.githubLinks ?

                        this.state.githubLinks.map((repo) => {
                          return (
                            <Card.Title>
                              <a href={repo.url} target="_blank">{repo.title}</a>
                            </Card.Title>
                          )
                        })

                        : undefined
                    }
                  </Card.Body>
                </Card>
              </Col>
            </Row>

          </React.Fragment>}

        </Container>
      </React.Fragment>
    )

  }
}

export default adminLayout(Dashboard);
