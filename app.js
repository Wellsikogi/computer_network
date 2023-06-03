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
const userRoles = {};
let votelist = {};

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
  //투표 로직
  socket.on("voteUser", (selectedUsername)=> {
    const voterUsername = socket.username;
    const Username = getUserSocketByUsername(selectedUsername);
    if(Username) {
      votelist[Username.id] = (votelist[Username.id] || 0) + 1;
    }
    console.log(`[${voterUsername}] voted for [${selectedUsername}]`);
    console.log("Current vote counts:", votelist);
    //투표 합 측정
    const voteCounts = Object.values(votelist).reduce((total, count) => total + count, 0);
    console.log("투표 합계:", voteCounts);
    //투표 합이 5라면
    if(voteCounts === 5){
      const entries = Object.entries(votelist);
      const maxIndex = entries.reduce((maxIdx, [key, value], idx) => {
        if (value > entries[maxIdx][1]) {
          return idx;
        } else {
          return maxIdx;
        }}, 0);
        const [maxKey, maxValue] = entries[maxIndex];
        console.log("가장 큰 값의 키:", maxKey);
        console.log("가장 큰 값:", maxValue);

        if(userRoles[maxKey] === "라이어"){
          io.emit("chatting", {
            name: "시스템",
            msg: "시민의 승리입니다.",
            time: moment(new Date()).format("h:mm A"),
            senderid: "system",
          });
          votelist = {};
        }
        else{
          io.emit("chatting", {
            name: "시스템",
            msg: "라이어의 승리입니다.",
            time: moment(new Date()).format("h:mm A"),
            senderid: "system",
          });
          votelist = {};
        }
    }
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
  // 게임 시작 메시지
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
      }, 1000 * (5 - i));
    }
    setTimeout(() => {
      io.emit("chatting", {
        name: "시스템",
        msg: "게임을 시작합니다!",
        time: moment(new Date()).format("h:mm A"),
        senderid: "system",
      });
      console.log("게임을 시작합니다!");

      // 역할 배열
      const roles = ["호스트", "라이어", "시민", "시민", "시민"];
      // 역할 랜덤 할당
      const shuffledRoles = shuffleArray(roles);
      for (let i = 0; i < userlist.length; i++) {
        const role = shuffledRoles[i];
        const username = userlist[i];
        const userSocket = getUserSocketByUsername(username);
        if (userSocket) {
          userSocket.role = role;
          userRoles[username] = role;//전역 변수에 username과 역할 저장
          io.to(userSocket.id).emit("assignRole", role);

          // 역할에 따른 안내 메시지 전송
          if (role === "호스트") {
            io.to(userSocket.id).emit("chatting", {
              name: "시스템",
              msg: "당신은 호스트입니다. 문제를 출제해주세요",
              time: moment(new Date()).format("h:mm A"),
              senderid: "system",
            });
          } else if (role === "라이어") {
            io.to(userSocket.id).emit("chatting", {
              name: "시스템",
              msg: "당신은 라이어입니다.",
              time: moment(new Date()).format("h:mm A"),
              senderid: "system",
            });
          } else if (role === "시민") {
            io.to(userSocket.id).emit("chatting", {
              name: "시스템",
              msg: "당신은 시민입니다.",
              time: moment(new Date()).format("h:mm A"),
              senderid: "system",
            });
          }
        }
      }
    }, 6000);
  }
});
//사용자 이름으로 소켓을 찾는 함수
function getUserSocketByUsername(username) {
  return Array.from(io.sockets.sockets.values()).find(
    (socket) => socket.username === username
  );
}
// 배열을 랜덤하게 섞는 함수
function shuffleArray(array) {
  const shuffledArray = [...array];
  for (let i = shuffledArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
  }
  return shuffledArray;
}
server.listen(PORT, '0.0.0.0',() => console.log(`server is running on ${PORT}`));