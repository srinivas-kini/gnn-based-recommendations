import { Configuration, OpenAIApi } from "openai";
import { QUERY_JSON } from "./query";

const configuration = new Configuration({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

export const getChatResponse = async (topics) => {

  if (!configuration.apiKey) {
    alert("API Key not set!")
  }

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: ` Provide a list of at least 4 medium blogs, research papers, videos and github links related to "${topics}", 
                    formatted as a properly formatted JSON object with the following structure: ${QUERY_JSON}. 
                    The keys in the outer JSON object should be exactly the same as the format in camelCase.
                    Each JSON object in the array should only have the 'title' and 'url' as keys. The URLs should be correct and not expired.`,
        },
      ],
    });

    return {
      body: completion.data.choices[0].message.content,
      code: 200
    };

  } catch (error) {

    if (error) {
      return {
        body: error,
        code: 500
      };
    } else {
      alert(`Error with OpenAI API request: ${error.message}`);
    }
  }
};
