const express = require("express");
const multer = require("multer");
const http = require("http");
const app = express();
const path = require("path");
const server = http.createServer(app);
const socketIO = require("socket.io");
const moment = require("moment");
const io = socketIO(server);

var answer = "";
var isPlaying = false;

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
  answer = req.body.answerInput;
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
let liername = "" ;
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
    const isDuplicate = userlist.some((user) => user !== socket.username && user === nickname);
    if(!isDuplicate){//바꾸는 닉네임이 중복이면 바뀌지 앟음
    const index = userlist.indexOf(socket.username);
      if (index !== -1) {
        userlist[index] = nickname;
        socket.username = nickname;
      }
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
      let maxIndex = 0;
      let maxValue = entries[maxIndex][1];
      let duplicateKeys = [];

      entries.forEach(([key, value], idx) => {
        if (value > maxValue) {
          maxIndex = idx;
          maxValue = value;
          duplicateKeys = []; // 새로운 최댓값을 발견했으므로 중복 키 배열 초기화
        } else if (value === maxValue) {
          duplicateKeys.push(key); // 최댓값과 동일한 값이면 중복 키 배열에 추가
        }
      });

      const maxKey = entries[maxIndex][0];
      console.log("가장 큰 값의 키:", maxKey);
      console.log("가장 큰 값:", maxValue);
      console.log("값의 중복 여부:", duplicateKeys.length > 1 ? "중복" : "단일");
        if(userRoles[maxKey] === "라이어" && duplicateKeys.length <= 1){
          io.emit("chatting", {
            name: "시스템",
            msg: "라이어를 맞췄습니다. 라이어는" + liername + "입니다.",
            time: moment(new Date()).format("h:mm A"),
            senderid: "system",
          });
          setTimeout(() => {
            io.emit("chatting", {
              name: "시스템",
              msg: "라이어는 정답을 입력해주시길 바랍니다. 정답을 맞추면 라이어의 역전승입니다.",
              time: moment(new Date()).format("h:mm A"),
              senderid: "system",
            });
            io.emit("lierphase") 
          }, 1000);
        }
        else{
          io.emit("chatting", {
            name: "시스템",
            msg: "라이어의 승리입니다. 라이어는 " + liername + "입니다.",
            time: moment(new Date()).format("h:mm A"),
            senderid: "system",
          });
          setTimeout(gamefin, 3000);
          
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

  socket.on("lieranswer", (lieranswer) => {
    if(lieranswer ===answer) {
      io.emit("chatting", {
        name: "시스템",
        msg: "라이어가 정답을 맞췄습니다. 라이어의 승리입니다!",
        time: moment(new Date()).format("h:mm A"),
        senderid: "system",
      });
    }else{
      io.emit("chatting", {
        name: "시스템",
        msg: `라이어가 틀렸습니다. 정답은${answer}였습니다!`,
        time: moment(new Date()).format("h:mm A"),
        senderid: "system",
      });
    }
    setTimeout(gamefin, 3000);
    
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
      isPlaying = true;

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
            liername = username;
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

function gamefin(){
  io.emit("chatting", {
    name: "시스템",
    msg: "게임이 종료되었습니다. 5명이 10초이상 유지될 경우 게임이 재시작됩니다.",
    time: moment(new Date()).format("h:mm A"),
    senderid: "system",
  });
  io.emit("gamefin");
  isPlaying = false;
  liername = "";
  votelist = {};

}
server.listen(PORT, '0.0.0.0',() => console.log(`server is running on ${PORT}`));