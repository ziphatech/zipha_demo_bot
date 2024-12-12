const userDataSchema = {
    userId: null,
    username:  null,
    fullName: null,
    subscription: {
      type: null,
      expirationDate: null,
      status: null,
    },
    inviteLink : {
      link: null,
      name: null
    },
    groupMembership: {
      groupId: null,
      joinedAt: null,
    },
  };
  
module.exports = userDataSchema;