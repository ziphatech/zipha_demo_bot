const Navigation = require("./navigationClass");

let instance;
// const nav = () => {
//   if (!instance) {
//     instance = new Navigation();
//   }
//   return instance;
// };
const nav = () => instance || (instance = new Navigation());

module.exports = nav;