require("dotenv").config();

const mongoose = require("mongoose");
const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
} = require("discord.js");

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const uri = process.env.URI;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
    ],
});

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
    try {
        await mongoose.connect(uri);
        console.log("Connected to database <3");
    } catch (error) {
        console.log(error);
    }
})();

const playerSchema = new mongoose.Schema({
    name: String,
    schuppenkarpfen: Number,
    lederkarpfen: Number,
    spiegelkarpfen: Number,
    kohaku: Number,
    orenji: Number,
    dinkels: Number,
});

const player = mongoose.model("Player", playerSchema);

(async () => {
    try {
        const commands = [
            new SlashCommandBuilder()
                .setName("info")
                .setDescription("Zeigt den aktuellen Stand an"),
            new SlashCommandBuilder()
                .setName("korrektur")
                .setDescription("Überschreibt den aktuellen Wert eines Fisches")
                .addStringOption((option) =>
                    option
                        .setName("fishname")
                        .setDescription("Name des Fisches")
                        .setRequired(true),
                )
                .addNumberOption((option) =>
                    option
                        .setName("newweight")
                        .setDescription("Neues Gewicht des Fisches")
                        .setRequired(true),
                ),
            new SlashCommandBuilder()
                .setName("turnierinfo")
                .setDescription("Zeigt die aktuellen Infos zum Turnier an"),
        ].map((command) => command.toJSON());

        await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
            body: commands,
        });
    } catch (error) {
        console.error(error);
    }
})();

client.on("ready", () => {
    console.log(`✅ ${client.user.username} ist online.`);
});

client.on("interactionCreate", async (interaction) => {
    const { commandName } = interaction;

    if (commandName == "info") {
        const table = await showTable(interaction.user.username);
        await interaction.reply(table);
    }

    if (commandName == "korrektur") {
        const fishName = interaction.options.getString("fishname").toLowerCase();
        const newWeight = interaction.options.getNumber("newweight");

        await overrideFish(interaction.user.username, fishName, newWeight);
        await interaction.reply("Vallah Vallah das kostet aber extra");
    }

    if (commandName == "turnierinfo") {
        await interaction.reply(
            "\n**Alle FÄSCHEEEE**\nSchuppenkarpfen: 12kg - 19kg\nLederkarpfen: 16kg - 26kg\nSpiegelkarpfen: 16kg - 24kg\nKohaku: 5kg - 10kg\nOrenji: 5kg - 10kg\nDinkelsbühler: 10kg - 20kg\n",
        );
    }
});

client.on("messageCreate", (message) => {
    if (message.author.bot) return;

    let [fishName, weightNum] = message.content.split(" ");

    if (!fishName || !weightNum)
        return message.reply("Bitte gib einen Fischnamen und ein Gewicht an.");

    let lowerCaseFishName = fishName.toLowerCase();
    let weight = weightNum.replace(',', '.');
    let weightNumber = parseFloat(weight);

    if (isNaN(weightNumber))
        return message.reply("Das Gewicht muss eine Zahl sein");

    let maxWeight = 0;
    let minWeight = 0;

    switch (lowerCaseFishName) {
        case "schuppenkarpfen":
            maxWeight = 19;
            minWeight = 12;
            break;
        case "lederkarpfen":
            maxWeight = 26;
            minWeight = 16;
            break;
        case "spiegelkarpfen":
            maxWeight = 24;
            minWeight = 16;
            break;
        case "kohaku":
        case "orenji":
            maxWeight = 10;
            minWeight = 5;
            break;
        case "dinkelsbühler":
            maxWeight = 20;
            minWeight = 10;
            break;
    }

    if (weight > maxWeight)
        return message.reply(
            `Vallah der ist viel zu schwer. Der ${lowerCaseFishName} muss zwischen ${minWeight}kg und ${maxWeight}kg liegen`,
        );
    if (weight < minWeight)
        return message.reply(
            `Vallah sogar der Lörres vom alten ist größer. Der ${lowerCaseFishName} muss zwischen ${minWeight}kg und ${maxWeight}kg liegen`,
        );
    let name = message.author.username;
    switch (name) {
        case "mephistophelisch":
            player.findOne({ name: "lisa" }).then((player) => {
                if (player[lowerCaseFishName] > weight)
                    return message.reply(
                        `Habibi dein größter ${lowerCaseFishName} ist momentan ${player[lowerCaseFishName]}kg :x Fehlen noch ${(maxWeight - player[lowerCaseFishName]).toFixed(3)}kg bis zum Limit`,
                    );
                player[lowerCaseFishName] = weight;
                player.save();
                message.reply(
                    `Vallah Vallah hab ich eingetragen. Fehlen noch ${(maxWeight - player[lowerCaseFishName]).toFixed(3)}kg.`,
                );
            });
            break;
        case "kruemellmonster":
            player.findOne({ name: "marvin" }).then((player) => {
                if (player[lowerCaseFishName] > weight)
                    return message.reply(
                        `Habibi dein größter ${lowerCaseFishName} ist momentan ${player[lowerCaseFishName]}kg :x Fehlen noch ${(maxWeight - player[lowerCaseFishName]).toFixed(3)}kg bis zum Limit`,
                    );
                player[lowerCaseFishName] = weight;
                player.save();

                message.reply(
                    `Vallah Vallah hab ich eingetragen. Fehlen noch ${(maxWeight - player[lowerCaseFishName]).toFixed(3)}kg bis zum Limit`,
                );
            });
    }
});

async function showTable(username) {
    let name = "";

    switch (username) {
        case "kruemellmonster":
            name = "marvin";
            break;
        case "mephistophelisch":
            name = "lisa";
            break;
    }

    const playerData = await player.findOne({ name: name });
    return `
        Schuppenkarpfen: ${playerData.schuppenkarpfen}kg
        Lederkarpfen: ${playerData.lederkarpfen}kg
        Spiegelkarpfen: ${playerData.spiegelkarpfen}kg
        Kohaku: ${playerData.kohaku}kg
        Orenji: ${playerData.orenji}kg
        Dinkels: ${playerData.dinkels}kg
      `;
}

async function overrideFish(username, fishName, newWeight) {
    let name = "";

    switch (username) {
        case "kruemellmonster":
            name = "marvin";
            break;
        case "mephistophelisch":
            name = "lisa";
            break;
    }

    let currentPlayer = await player.findOne({ name: name }).then((player) => {
        player[fishName] = newWeight;
        player.save();
    });
}
client.login(token);
