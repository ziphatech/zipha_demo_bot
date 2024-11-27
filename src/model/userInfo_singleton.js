const userDataSchema = require("./user.data");
const { UserInfo } = require("./userManagementClass");

let instance;

const userData = (data) => {
  if (!data) {
    throw new Error("No data provided");
  }
  if (!instance) {
    instance = new UserInfo(data);
  } else {
    instance.updateData(data); // Update the existing instance with new data
  }
  return instance;
};
const createUserInstance = userData(userDataSchema)

module.exports = {
  createUserInstance
}