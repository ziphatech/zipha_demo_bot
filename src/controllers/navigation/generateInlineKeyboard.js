function generateInlineKeyboard(options) {
    const keyboard = [];
    options.forEach((optionRow) => {
      const row = [];
      optionRow.forEach((option) => {
        const button = {}; // Declare the button variable here
        if (option.url) {
          button.text = option.text;
          button.url = option.url;
        } else {
          button.text = option.text;
          button.callback_data = option.callback_data;
        }
        row.push(button);
      });
      keyboard.push(row);
    });
    return keyboard;
  }
  module.exports = {
    generateInlineKeyboard
  }