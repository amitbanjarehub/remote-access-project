const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const screenshot = require('screenshot-desktop');
var robot = require("robotjs");
const log = require('electron-log');
const { createLOG10E } = require('mathjs');

// var socket = require('socket.io-client')('http://192.168.29.63:5000');
// var socket = require('socket.io-client')('http://localhost:5000');
var socket = require('socket.io-client')('http://82.112.237.153:7000');
var interval;


const validKeys = new Set([
    "control", "shift", "alt", "space", "enter", "backspace", "delete",
    "arrowup", "arrowdown", "arrowleft", "arrowright", "a", "b", "c", "d", "e", "f", "g", "h",
    "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v",
    "w", "x", "y", "z", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "-", "+", "=", "`", "/",
    ",", ".", ";", "'", "[", "]", "{", "}", "_",
    // Add more keys as needed
]);

const specialCharMapping = {
    "!": { key: "1", shift: true },
    "@": { key: "2", shift: true },
    "#": { key: "3", shift: true },
    "$": { key: "4", shift: true },
    "%": { key: "5", shift: true },
    "^": { key: "6", shift: true },
    "&": { key: "7", shift: true },
    "*": { key: "8", shift: true },
    "(": { key: "9", shift: true },
    ")": { key: "0", shift: true },
    "_": { key: "-", shift: true },
    "+": { key: "=", shift: true },
    "{": { key: "[", shift: true },
    "}": { key: "]", shift: true },
    "[": { key: "[", shift: false },
    "]": { key: "]", shift: false },
    "+": { key: "+", shift: false },
    "-": { key: "-", shift: false },
    "=": { key: "=", shift: false },
    "`": { key: "`", shift: false },
    ",": { key: ",", shift: false },
    ".": { key: ".", shift: false },
    ";": { key: ";", shift: false },
    "'": { key: "'", shift: false },
    "/": { key: "/", shift: false },
    // Add more special characters if needed
};

function isValidKey(key) {
    return validKeys.has(key.toLowerCase()) || specialCharMapping[key] !== undefined;
}

function createWindow() {
    const win = new BrowserWindow({
        width: 500,
        height: 150,
        webPreferences: {
            nodeIntegration: true,

        }
    })
    win.removeMenu();
    win.loadFile('index.html')

    // Open DevTools to see the console for renderer process
    win.webContents.openDevTools();

    // Log to the terminal and file
    log.info("Main process: Application started");




    const clientScreenWidth = robot.getScreenSize().width;
    const clientScreenHeight = robot.getScreenSize().height;


    socket.on("mouse-move", function (data) {
        var obj = JSON.parse(data);
        // var x = obj.x;
        // var y = obj.y;

        // robot.moveMouse(x, y);

        const serverX = obj.x;
        const serverY = obj.y;

        // Adjust the coordinates to match the client screen size
        const clientX = (serverX / 1920) * clientScreenWidth;
        const clientY = (serverY / 1080) * clientScreenHeight;

        robot.moveMouse(clientX, clientY);
        // log.info(`Mouse moved to: (${clientX}, ${clientY})`); // Log in the main process

    })



    socket.on("mouse-click", function (data) {
        robot.mouseClick();

        log.info("Mouse clicked"); // Log mouse click event
    })

    // socket.on("type", function(data){
    //     var obj = JSON.parse(data);
    //     var key = obj.key;

    //     robot.keyTap(key);
    // })


    // Listen for scroll events and apply them to client screen
    socket.on("mouse-scroll", function (data) {
        console.log("mouse scroll in app.js:========>>>", data);
        log.info("This is a log message from the main process:========>>>", data);
        const { scrollDirection } = JSON.parse(data);
        const scrollAmount = 50; // Adjust this for scroll speed

        if (scrollDirection === 'scrollDown') {
            robot.scrollMouse(0, scrollAmount);  // Scroll down
        } else if (scrollDirection === 'scrollUp') {
            robot.scrollMouse(0, -scrollAmount);  // Scroll up
        }

        log.info(`Mouse scrolled: ${scrollDirection}`); // Log scroll direction
    });


    // socket.on("mouse-scroll", function (data) {
    //     log.info(`Mouse scrolled data: ${data}`); // Log scroll direction


    //     const { scrollDirection } = JSON.parse(data);
    //     const scrollAmount = 50; // Adjust this for scroll speed

    //     // Use robotjs to scroll based on the direction
    //     if (scrollDirection === 'scrollDown') {
    //         robot.scrollMouse(0, scrollAmount);  // Scroll down
    //         log.info(`Mouse scrolled down : ${scrollAmount}`); // Log scroll direction
    //     } else if (scrollDirection === 'scrollUp') {
    //         robot.scrollMouse(0, -scrollAmount);  // Scroll up
    //         log.info(`Mouse scrolled up: ${-scrollAmount}`); // Log scroll direction
    //     }
    // });

    socket.on("mouse-scroll", function (data) {
        log.info(`Mouse scrolled data: ${data}`); // Log scroll direction
        const { deltaY } = JSON.parse(data);
        log.info(`deltaY data: ${deltaY}`); // Log scroll direction
        win.scrollBy(0, deltaY);
    })
    // Handle keyboard events, including special keys and modifiers
    socket.on("type", function (data) {
        const { key, ctrl, shift, alt } = JSON.parse(data);

        // Handle special characters
        if (specialCharMapping[key]) {
            const { key: mappedKey, shift: requiresShift } = specialCharMapping[key];
            if (requiresShift) robot.keyToggle("shift", "down");
            robot.keyTap(mappedKey);
            if (requiresShift) robot.keyToggle("shift", "up");
            return;
        }

        // Validate key
        if (!isValidKey(key)) {
            console.warn(`Invalid key: ${key}`);
            return; // Ignore unsupported keys
        }

        // Apply modifiers if necessary
        if (ctrl) robot.keyToggle("control", "down");
        if (shift) robot.keyToggle("shift", "down");
        if (alt) robot.keyToggle("alt", "down");

        // Type the key
        // robot.keyTap(key);
        if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
            // For arrow keys, robotjs expects "up", "down", "left", "right"
            robot.keyTap(key.replace("arrow", ""));
        } else {
            robot.keyTap(key);
        }

        // Release modifiers
        if (ctrl) robot.keyToggle("control", "up");
        if (shift) robot.keyToggle("shift", "up");
        if (alt) robot.keyToggle("alt", "up");
    });

}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

ipcMain.on("start-share", function (event, arg) {

    var uuid = "test";//uuidv4();
    socket.emit("join-message", uuid);
    event.reply("uuid", uuid);

    interval = setInterval(function () {
        screenshot().then((img) => {
            var imgStr = new Buffer(img).toString('base64');

            var obj = {};
            obj.room = uuid;
            obj.image = imgStr;

            socket.emit("screen-data", JSON.stringify(obj));
        })
    }, 500)
})

ipcMain.on("stop-share", function (event, arg) {

    clearInterval(interval);
})
