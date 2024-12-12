const Coupon = require("../../../model/couponClass");
const { createUserInstance } = require("../../../model/userInfo_singleton");
const couponInstance = Coupon.getInstance();


exports.handlePollAnswer = async (ctx) => {
    const pollAnswer = ctx.pollAnswer;
    const userId = pollAnswer.user.id;
    const pollMessageId = await couponInstance.getPollMessageId();
  
    try {
      const selectedOptions = ctx.pollAnswer.option_ids.map((optionId) => {
        switch (optionId) {
          case 0:
            return { callback_data: "one_month", text: "VIP 1 month" };
          case 1:
            return { callback_data: "three_months", text: "VIP 3 months" };
          case 2:
            return { callback_data: "six_months", text: "VIP 6 months" };
          case 3:
            return { callback_data: "twelve_months", text: "VIP 12 months" };
          case 4:
            return { callback_data: "one_on_one_price_list", text: "Mentorship 1 on 1" };
          case 5:
            return { callback_data: "mentorship_price_list", text: "Mentorship Group" };
        }
      });
  
      await couponInstance.setSelectedOptions(userId,selectedOptions);
      const optionsText = selectedOptions.map((option) => `\n${option.text}`).join("\n");
      const selectedOption = selectedOptions.find((option) => 
        option?.callback_data.includes('month') ||
        option?.callback_data.includes('mentorship_price_list') ||
        option?.callback_data.includes('one_on_one_price_list')
  
        );
      createUserInstance.subscribe(selectedOption?.callback_data)
      // console.log(selectedOptions,"selectedOption");
      await ctx.api.sendMessage(
        userId,
        `You have successfully selected:\n <i>${optionsText}</i>`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Generate Code",
                  callback_data: "generate_code",
                },
                {
                  text: "Cancel Code",
                  callback_data: "cancleCoupon",
                },
              ]
            ],
          },
          parse_mode:"HTML" 
        }
      );
      await ctx.api.deleteMessage(userId, pollMessageId);
      // console.log( await couponInstance.getSelectedOptions())
    } catch (error) {
      console.error("Error handling poll answer:", error);
    }
  };


// const STATES = {
//   VIP_PLAN: "VIP_PLAN",
//   MENTORSHIP_PLAN: "MENTORSHIP_PLAN",
//   GENERATE_COUPON: "GENERATE_COUPON",
// };
// exports.handlePollAnswer = async (ctx) => {
//   const pollAnswer = ctx.pollAnswer;
//   const userId = pollAnswer.user.id;
//   const currentState = await couponInstance.getCurrentPollAnswer();
//   console.log(currentState === STATES.VIP_PLAN)
//   console.log("currentState,STATES.VIP_PLAN",currentState,STATES.VIP_PLAN)
//   let pollMessageId   
//   try {
//     if (currentState === STATES.VIP_PLAN) {
//       pollMessageId = await couponInstance.getPollMessageId()
//       // Handle VIP plan poll answer
//       const selectedVipOptions = ctx.pollAnswer.option_ids.map((optionId) => {
//         switch (optionId) {
//           case 0:
//             return { callback_data: "one_month", text: "VIP 1 month" };
//           case 1:
//             return { callback_data: "three_months", text: "VIP 3 months" };
//           case 2:
//             return { callback_data: "six_months", text: "VIP 6 months" };
//           case 3:
//             return { callback_data: "twelve_months", text: "VIP 12 months" };
//         }
//       });

//       await couponInstance.setSelectedOptions(selectedVipOptions);
//       console.log(selectedVipOptions,"selectedVipOptions")
//       await ctx.api.deleteMessage(userId, pollMessageId);

//       await couponInstance.setCurrentPollAnswer(STATES.MENTORSHIP_PLAN)
//       const question = "Please select mentorship options:";
//       const mentorshipOptions = ["Mentorship 1 on 1", "Mentorship Group"];
      
//       const mentorshipPoll = await ctx.api.sendPoll(userId, question, mentorshipOptions, {
//         is_anonymous: false,
//         allows_multiple_answers: true,
//       });
//      await couponInstance.setPollMessageId(mentorshipPoll.message_id)
//     } else if (currentState === STATES.MENTORSHIP_PLAN) {
//       // Handle mentorship poll answer
//       const seletedOptions = await couponInstance.getSelectedOptions()
     
//       pollMessageId = await couponInstance.getPollMessageId()
//       const selectedMentorshipOptions = ctx.pollAnswer.option_ids.map((optionId) => {
//         switch (optionId) {
//           case 0:
//             return { callback_data: "one_on_one_price_list", text: "Mentorship 1 on 1" };
//           case 1:
//             return { callback_data: "mentorship_price_list", text: "Mentorship Group" };
//         }
//       });
//       const seletedOptionsArr = [...seletedOptions,...selectedMentorshipOptions]
//       await ctx.api.deleteMessage(userId, pollMessageId);
//       await couponInstance.setSelectedOptions(seletedOptionsArr);
//       const optionsText = seletedOptionsArr.map((option) => option.text).join(", ");
      
//           await ctx.api.sendMessage(
//             userId,
//             `Options selected successfully! ${optionsText}`,
//             {
//               reply_markup: {
//                 inline_keyboard: [
//                   [
//                     {
//                       text: "Generate Code",
//                       callback_data: "generate_code",
//                     },
//                   ],
//                 ],
//               },
//             }
//           );
//       // ctx.session.selectedMentorshipOptions = selectedMentorshipOptions;
//       console.log(optionsText,seletedOptionsArr)

//       // await generateCoupon(ctx);
//     }
//   } catch (error) {
//     console.error("Error handling poll answer:", error);
//   }
// };

 
