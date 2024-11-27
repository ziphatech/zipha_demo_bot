let instance = null;

const Broadcast = () => {
  return instance || (instance = {
    active: false,
    message: null,
    userId: {},
    messageId: null,
  });
};

module.exports = Broadcast;