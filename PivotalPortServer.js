//gets current port from environment
var port = process.env.PORT || 9000;

//import dependancies
var http = require('http');
var websocket = require("websocket.io");
var express = require("express");
var request = require('request');
var GoogleSpreadsheet = require("google-spreadsheet");
var async = require('async');

//set static http server listening at port and bind websocket to http 
var app = express();
app.use(express.static(__dirname + "/"));
var webServerApp = http.createServer(app).listen(port);  
var webSocketServer = websocket.attach(webServerApp);

console.log("http server listening on %d", port)

//Web Socket part
webSocketServer.on("connection", function (socket) {

    console.log("Connection established."); 

    socket.send("Ready to port from tracker");

    //do when receiving a message
    socket.on("message", function (message) {
        socket.send("Preparing to port stories") 

        //parse JSON string 
        obj = JSON.parse(message);
        var clearNum = parseInt(obj['clrLn']);
        var worksheetNum = parseInt(obj['shtNm']);

        //extract spreadsheet key from url 
        var spreadsheetKey = getIdFromUrl(obj['shURL']);

        //removes non numerical characters from the url to obtain project ID
        var projectNum = obj['trURL'].replace(/\D/g, ''); 

        console.log("Spreadsheet key:" + spreadsheetKey);
        console.log("Spreadsheet num:" + projectNum);

        //begin constructing https request to pivotal tracker
        var https = require('https');
        var sheet;
        var options = {
            uri: 'https://www.pivotaltracker.com/services/v5/projects/' + projectNum + '/stories?date_format=millis&with_state=finished',
            method: 'GET',
            json: true,
            headers: { "X-TrackerToken": '40eb129012034543a6c055a87cb38d59' }
        };
        
        //make pivotal tracker api request
        request(options, function(error, response, body){
            if(error) {
                console.log(error);
            } else {
                //open the google spreadsheet by key
                var doc = new GoogleSpreadsheet(spreadsheetKey);

                //async series takes arguments array of functions to execute with arguments callback, and callback function to execute when all tasks complete
                async.series([
                    //oauth 
                    function setAuth(step) {
                        var creds_json = {
                            client_email: "tribalscale@pivotal-port.iam.gserviceaccount.com",
                            private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCd69PRqMwbObBh\ndE43v0SXStBT5OH6+pbJerwpZ9ftDtOQrfljrcDfHVLYZoyD4rU8Wl6AgUy0odiY\nE3aHa/3h9lEof7u75ZEB6hddwKFu5pFudecIdNzTAQwYZX0wDfjgdMO1gfL3dt7r\nyIfwjcL3C9XjJLqbB/HOSP0brgi9U6JFsYLgN3co7oQG+lW/+PK7xXGJGWKjOr2K\nf5NcwS/MIdx+u7MmWxYQ/WgC5Vcy29AeRyXnU/vuHIwTnU4u6FJZ42Dy7FS5RXQZ\n082B1oiaW76DI8Fh1jvYj1qNNamcGI8KPluGGn2S9lMkrw7Od+bCHp2wRtuILtNI\nPzCzh5JNAgMBAAECggEAVAqVrkTzYiXATQy1N4uteApTdeIftQ44wr5zdmGSEtFK\nG/vJ9ZcZRmN3nDxu2R0EMDszgZXN+W8MMlphQM5izSblp/TaNrOECQ3II5eJEdjY\nWn2aVvDCN/SduDoCdllpMiJRqL2gTLvRBI+ycH0w3YJJ8FiyiiCfOZW0RU/HzODl\nITnn7MmiVo/JuYGB77WwbJrxgqXELCcQchtPiL/QkuVJ08BKbzxwVLLzYr91yafx\nr991GdrDhbYC3QcChTR1Yi4FqhHn3LfH/sYLcL79F2qQdgvgUDeudZaeBxRSbXz7\nCWGIgtUlbnNYqbGQAJ2QJaID6b4E614C2rAl+TEnQQKBgQDudBIHwdTX//bVLfqM\nn+05Vbr8c6ReaVBxvreCkUr4eiyYwOhIhLAKlKzMJzl/0yfo1+cJsecFLX65HLBo\ndVEnRmLfIFnnbNG9o0YeYiQhxW5TuqczUgx/InWcLWSv2+4Mn6eaBo3YG7fIcv/X\nsiDRRv7M2JfLjtmj79MhxSEzcQKBgQCpirXO7/SDIliIg/3yh2s9XR61MfEhmhGL\n42sZSWwfASyU3SFji2J0Y5dnPUBdKR+2RhwxTyORUPwRBk+llBNUKUjMC3X0jLtR\nPUOKVFvbIeIi5bKVJsjYErtYfwYVrllDC/p4vZy/oPlrXcc/ugXh4PWZVq6yqBuh\nNtsb4GxmnQKBgDSWKmfFil/8Vf4bfrbGijVrv6nvAt/DT/dVvPixfBwiLXWejVt4\nz631rcn0GI0lDxcdjhkoP693ogvG1OykeroznphgdRNBf1vYBx2qPReph7Q1ZKw/\nuvvKqK9Bn4Pc97mW+ApSybNQIY62Nc/mu7ALfSPF3GwK29p4iFJZPAIxAoGAR7nl\nPM0Ldsb7CZY9w3NDDUzuBt5AE2Uo8zOdRa9oTJ2kjL4YuBJp7q+LiCPDrSYOwoBa\nwQmoFHxch59R5s0EeGCW6awXlQRM4wu2HTmfOs/U6cqfiLZF1hPmqoPiwR1nqhPR\nPW+Kdw/VNXURLIa4ol0Xym1/rxmrxsJ8ZAjIE4kCgYB6RDUsOTlvHZihcfBqdMhA\nn77+Pf7EkLuFqJT4tUzRkriiH2MdY+iKYDa8z2fyA2p6UikIvRd151DA9BWrOgNN\nLlxTnEkmLpPWc+4gtBblemakc7Incjgrpo54joyKUOujsRHmFYa8JyKzgFGw8JfO\n4pREE0r2zzG+Q8OLwjJgHg==\n-----END PRIVATE KEY-----\n"
                        }
                 
                        doc.useServiceAccountAuth(creds_json, step);
                    },
                    //gets spreadsheet info
                    function getInfoAndWorksheets(step) {
                        doc.getInfo(function(err, info) {
                            console.log('Loaded doc: '+info.title+' by '+info.author.email);

                            //creates worksheet item
                            sheet = info.worksheets[worksheetNum-1];

                            //error checking for worksheet out of range
                            if (sheet === undefined){
                                console.log(worksheetNum + " is not a valid sheet");
                                socket.send(worksheetNum + " is not a valid worksheet number");
                                return;
                            }

                            socket.send('Porting to: ' + info.title + ' - ' + sheet.title);

                            //callback
                            step();
                        });
                    },
                    function deletingCells(step) {
                        console.log("deleting cells")
                        sheet.getCells({
                            'min-row': 2,
                            'max-col': 6,
                            'return-empty': true
                        }, function(err, cells) {
                            //"deletes" all cells up to line clearNum in the first 6 columns
                            for (var i = 0; i < (clearNum-1)*6; i++){
                                cells[i].value = "";
                            }

                            //update cells and call callback function
                            sheet.bulkUpdateCells(cells, step); 
                        });
                    },
                    function portStories(step) {
                        console.log("porting stories")
                        socket.send("Porting stories")
                        sheet.getCells({
                            'min-row': 2,
                            'max-col': 1,
                            'return-empty': true
                        }, function(err, cells) {
                            for (var i = 0; i < body.length; i++){
                                cells[i].value = body[i].name;
                            }
                            sheet.bulkUpdateCells(cells, step); 
                        });
                    },
                    function portStoryIDs(step) {
                        console.log("porting urls")
                        sheet.getCells({
                            'min-row': 2,
                            'min-col': 5,
                            'max-col': 5,
                            'return-empty': true
                        }, function(err, cells) {
                            for (var i = 0; i < body.length; i++){
                                cells[i].value = body[i].url;
                            }
                            sheet.bulkUpdateCells(cells, step); 
                        });
                    }
                ], function(err){
                    console.log("transfer completed");
                    socket.send("Transfer completed");
                });
            }
        });
    });

    socket.on("error", function(error){
        console.log("Error: " + error);
    });

    socket.on("close", function () { console.log("Connection closed."); });
});

//parses the URL for the google spreadsheet key
function getIdFromUrl(url) {
    return url.match(/[-\w]{25,}/);
}

















