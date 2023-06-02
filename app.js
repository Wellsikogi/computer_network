const express = require("express");
const multer = require("multer");
const http = require("http");
const app = express();
const path = require("path");
const server = http.createServer(app);
const socketIO = require("socket.io");
const moment = require("moment");

const io = socketIO(server);

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/images");
  },
  filename: function (req, file, cb) {
    var fileName = "problem.jpg";
    cb(null, fileName);
  },
});


var upload = multer({ storage: storage });

// app.post("/upload", upload.single("image"), function (req, res) {
//   res.send("파일 업로드 완료");
// });

// app.post("/upload", upload.single("image"), function (req, res) {
//   const imageUrl =
//     req.protocol + "://" + req.hostname + "/uploaded-images/problem.jpg";
//     app.post("/upload", upload.single("image"), function (req, res) {
//       const imageUrl =
//         req.protocol + "://" + req.hostname + "/uploaded-images/problem.jpg";
//       res.send(
//         '<html><body><h1>파일 업로드 완료</h1><img src="' +
//           imageUrl +
//           '" alt="Uploaded Image"></body></html>'
//       );
//     });
// });
app.post("/upload", upload.single("image"), function (req, res) {
  const imageUrl = req.protocol + "://" + req.hostname+":5000/uploaded-images/problem.jpg";
  console.log("image uploaded on" + imageUrl);
  const topic = req.body.topicInput; 
  const answer = req.body.answerInput;
  console.log(topic);
  console.log(answer);
  res.send(
    '<html><body><h1>파일 업로드 완료</h1></body></html>'
  );
  io.emit("imguploaded",{
    imageUrl: imageUrl,
    topic: topic,
    answer: answer
  });
});
app.use("/uploaded-images", express.static(path.join(__dirname, "public/images")));

app.use(express.static(path.join(__dirname, "src")));

const PORT = process.env.PORT || 5000;

// 사용자 목록
const userlist = [];

io.on("connection", (socket) => {
  // 사용자가 접속한 경우
  socket.on("connectUser", (username) => {
    socket.username = username;
    if (!userlist.includes(username)) {
      userlist.push(username);
    }
    // 모든 클라이언트에게 사용자 목록 전달
    io.emit("userList", userlist);
  });
socket.on("changeNickname", (nickname) =>{
  const index = userlist.indexOf(socket.username);
    if (index !== -1) {
      userlist[index] = nickname;
      socket.username = nickname;
    }
    // 변경된 사용자 목록을 모든 클라이언트에게 전달
    io.emit("userList", userlist);
})
  // 사용자가 접속을 종료한 경우
  socket.on("disconnect", () => {
    const index = userlist.indexOf(socket.username);
    if (index !== -1) {
      userlist.splice(index, 1); 
    }
    // 모든 클라이언트에게 사용자 목록 전달
    io.emit("userList", userlist);
  });

  socket.on("chatting", (data) => {
    const { name, msg, senderid } = data;
    io.emit("chatting", {
      name,
      msg,
      time: moment(new Date()).format("h:mm A"),
      senderid,
    });
    console.log(
      `${name}(${senderid}): ${msg} ${moment(new Date()).format("h:mm A")}`
    );
  });
  //게임 시작 메세지
  if (io.sockets.sockets.size === 5) {  
      
    for (let i = 5; i >= 1; i--) {
      setTimeout(() => {
        io.emit("chatting", {
          name: "시스템",
          msg: i.toString(),
          time: moment(new Date()).format("h:mm A"),
          senderid: "system",
        });
        console.log(i);
      }, 1000 * (5-i));
    }
    setTimeout(() => {
      io.emit("chatting", {
        name: "시스템",
        msg: "게임을 시작합니다!",
        time: moment(new Date()).format("h:mm A"),
        senderid: "system",
      });
      console.log("게임을 시작합니다!");
    }, 6000);

  }
});

server.listen(PORT, '0.0.0.0',() => console.log(`server is running on ${PORT}`));