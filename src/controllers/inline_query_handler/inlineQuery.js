const { InlineKeyboard, InlineQueryResultBuilder } = require("grammy");

// General function to handle all inline queries
async function handleInlineQuery(ctx) {
    const query = ctx.inlineQuery.query;
    console.log(`Received inline query: ${query} `,ctx.inlineQuery);
  
    try {
      const results = await generateInlineQueryResults(query,ctx);
      console.log('Generated results:', results);
  
      await ctx.answerInlineQuery(results, { cache_time: 300 });
      
      // Clear the timeout if results are successfully sent
    //   clearTimeout(timeout);
    } catch (error) {
      console.error('Error handling inline query:', error);
      ctx.reply('An error occurred while processing your query.');
    }
  }
  
  
// Function to generate inline query results based on the query
async function generateInlineQueryResults(query,ctx) {
    console.log(`Processing query: ${query}`); // Debugging line
  
    const lowerQuery = query.toLowerCase().trim();
    console.log(`Lowercase query: ${lowerQuery}`); // Debugging line
  
    if (lowerQuery.includes('post ')) {
        console.log(ctx.update.inline_query.message,"ctx.update.inline_query.message");
        console.log('Query contains "post"'); // Debugging line
        const queryWithoutPost = query.replace('post ', '');
        console.log(`Query without post: ${queryWithoutPost}`); // Debugging line
        const photoId = ctx.update.inline_query.message.photo[0].file_id;
        result = [
          {
            type: 'photo',
            id: 'id-post',
            photo_file_id: photoId,
            title: 'Title 1',
            caption: queryWithoutPost,
            parse_mode: 'HTML',
            show_caption_above_media: true,
            reply_markup: {
              inline_keyboard: [
                [{
                  text: 'Contact Us',
                  url: '(link unavailable)'
                }]
              ]
            },
            input_message_content: {
              message_text: queryWithoutPost,
            }
          }
        ]
        return result;
      } else {
      console.log(`No matching condition for query: ${query}`); // Debugging line
      return [
        InlineQueryResultBuilder.article("id-default", "Unknown query")
          .text("Please use a valid query prefix like 'movie ' or 'gif '.")
      ];
    }
  }
  
// General function to handle chosen inline results
async function handleChosenInlineResult(ctx) {
  const resultId = ctx.chosenInlineResult.result_id;
  const query = ctx.chosenInlineResult.query;

  // Handle the chosen result based on the result_id or query
  console.log(`Chosen result: ${resultId} for query: ${query}`);

  // Additional processing if needed
  // For example, you can log the chosen result or perform an action based on it
}
module.exports = {
    handleChosenInlineResult,
    handleInlineQuery 
}