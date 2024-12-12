const Coupon = require("../../../model/couponClass");
const couponInstance = Coupon.getInstance();

exports.generateCouponHandler = async (ctx) => {
  const options = ctx.update?.callback_query?.data;
  if (options === "generate_coupon") {
    const question = "Please select multiple options for combo gifting:";
    const options = [
      "VIP 1 month",
      "VIP 3 months",
      "VIP 6 months",
      "VIP 12 months",
      "Mentorship 1 on 1",
      "Mentorship Group",
    ];

    const answer = await ctx.replyWithPoll(question, options, {
      is_anonymous: false,
      allows_multiple_answers: true,
    });
    await couponInstance.setPollMessageId(answer.message_id);
  }
};


// exports.generateCouponHandler = async (ctx) => {
//   const options = ctx.update?.callback_query?.data;
//   if (options === "generate_coupon") {
//     const question = "Please select a VIP plan:";
//     const vipOptions = [
//       ["VIP 1 month", "vip_1_month"],
//       ["VIP 3 months", "vip_3_months"],
//       ["VIP 6 months", "vip_6_months"],
//       ["VIP 12 months", "vip_12_months"],
//     ];

//     const vipPoll = await ctx.replyWithPoll(question, vipOptions.map((option) => option[0]), {
//       is_anonymous: false,
//       allows_multiple_answers: false,
//     });

   
//     await couponInstance.setPollMessageId(vipPoll.message_id);

//   }
// };