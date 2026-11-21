// import MagicMirror's built in helper system
const NodeHelper = require("node_helper");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { URL } = require("url");
const { google } = require("googleapis");

// tells Google MirrorMirro has read-only permission
const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];
const TOKEN_PATH = path.join(__dirname, "token.json");
const CREDENTIALS_PATH = path.join(__dirname, "credentials.json");

module.exports = NodeHelper.create({
    start: function () {
        console.log("MMM-Custom-Calendar node_helper started"); // for debugging 
    },

    // helper listens for request
    socketNotificationReceived: async function (notification, payload) {
        if (notification === "GET_CALENDAR_EVENTS") {
            console.log("Received request to get calendar events"); // for debugging 
            // hard coded data for testing
            /*
            this.sendSocketNotification("CALENDAR_EVENTS_RESULT",{
                events: [
                    {
                      title: "Test Meeting",
                      start: "10:00 AM"
                    },
                    {
                      title: "Demo Class",
                      start: "2:00 PM"
                    }
                  ]
            });
            */

            try {
                const auth = await this.authorize();
                const events = await this.fetchEvents(auth, payload.maxEvents || 5);

                this.sendSocketNotification("CALENDAR_EVENTS_RESULT", {
                    events
                });
            } catch(error) {
                console.error("Failed to fetch events: ", error);

                this.sendSocketNotification("CALENDAR_EVENTS_ERROR", {
                    error: error.message
                });
            }
        }
      },

      authorize: async function () {
        const content = fs.readFileSync(CREDENTIALS_PATH, "utf8");
        const credentials = JSON.parse(content);
        const { client_secret, client_id, redirect_uris } = credentials.web;
        const redirectUri = "http://localhost:3000";
      
        const oAuth2Client = new google.auth.OAuth2(
            client_id,
            client_secret,
            redirect_uris[0]
        );
      
        if (fs.existsSync(TOKEN_PATH)) {
            const token = fs.readFileSync(TOKEN_PATH, "utf8");
            oAuth2Client.setCredentials(JSON.parse(token));
            return oAuth2Client;
        }
      
        return await this.getNewToken(oAuth2Client);
      },

      getNewToken: function (oAuth2Client) {
        return new Promise((resolve, reject) => {
          const authUrl = oAuth2Client.generateAuthUrl({
            access_type: "offline",
            scope: SCOPES
          });
      
          console.log("\nAuthorize this app by visiting this URL:");
          console.log(authUrl);
          
          const server = http.createServer(async (req, res) => {
            try {
                const reqUrl = new URL(req.url, "http://localhost:3000");
                const code = reqUrl.searchParams.get("code");
      
                if (!code) {
                    res.end("No code found.");
                    return;
                }
        
                const { tokens } = await oAuth2Client.getToken(code);
                oAuth2Client.setCredentials(tokens);
                fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
        
                res.end("Authorization successful. You can close this tab.");
                server.close();
        
                resolve(oAuth2Client);
                } catch (error) {
                reject(error);
                }
            });
      
          server.listen(3000, () => {
            console.log("Listening on port 3000 for OAuth callback...");
          });
        });
      },

      fetchEvents: async function (auth, maxEvents) {
        const calendar = google.calendar({ version: "v3", auth });
      
        const res = await calendar.events.list({
            calendarId: "primary",
            timeMin: new Date().toISOString(),
            maxResults: maxEvents,
            singleEvents: true,
            orderBy: "startTime"
        });
      
        const events = res.data.items || [];
      
        return events.map((event) => ({
            title: event.summary || "Untitled Event",
            start: event.start.dateTime || event.start.date || "No start time",
            end: event.end?.dateTime || event.end?.date || "No end time",
            location: event.location || ""
        }));
      }
});