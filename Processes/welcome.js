require("../Core.js");
const { mk } = require("../Database/dataschema.js");

module.exports = async (Yaka, anu) => {
  try {
    let metadata = await Yaka.groupMetadata(anu.id);
    let participants = anu.participants;
    let desc = metadata.desc || "No Description";

    for (let num of participants) {
      let ppuser;
      try {
        ppuser = await Yaka.profilePictureUrl(num, "image");
      } catch {
        ppuser = botImage4; // garanta que botImage4 está definido em algum lugar
      }

      if (anu.action === "add") {
        let WELstatus = await mk.findOne({ id: anu.id }); // corrigido aqui

        let WelcomeFeature = "false";
        if (WELstatus) {
          WelcomeFeature = WELstatus.switchWelcome || "false";
        }

        let WAuserName = num.split("@")[0];
        console.log(`\n+${WAuserName} Joined/Got Added in: ${metadata.subject}\n`);

        let Yakatext = `
Hello @${WAuserName} -Kun,

Welcome to *${metadata.subject}*.

*🌀 Group Description 🌀*

${desc}

*Thank You.*
        `;

        if (WelcomeFeature === "true") {
          Yaka.sendMessage(anu.id, {
            image: { url: ppuser },
            caption: Yakatext,
            mentions: [num],
          });
        }
      } else if (anu.action === "remove") {
        let WELstatus = await mk.findOne({ id: anu.id }); // corrigido aqui

        let WelcomeFeature = "false";
        if (WELstatus) {
          WelcomeFeature = WELstatus.switchWelcome || "false";
        }

        let WAuserName = num.split("@")[0];
        console.log(`\n+${WAuserName} Left/Got Removed from: ${metadata.subject}\n`);

        let Yakatext = `
@${WAuserName} -Kun left the group.
        `;

        if (WelcomeFeature === "true") {
          Yaka.sendMessage(anu.id, {
            image: { url: ppuser },
            caption: Yakatext,
            mentions: [num],
          });
        }
      }
    }
  } catch (err) {
    console.log(err);
  }
};
