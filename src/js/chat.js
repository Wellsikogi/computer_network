"use strict";

const socket = io();
const nicknameinput = document.querySelector("#nickname");
const user_list = document.querySelector(".user_list");
const chatList = document.querySelector(".chatting_list");
const chatInput = document.querySelector(".chatting_input");
const sendButton = document.querySelector(".send_button");
const nickname_modify_button = document.querySelector(".nickname_modify_button");
const displayContainer = document.querySelector(".display_container");
// const popupButton = document.querySelector(".popup_button");
const roleText = document.querySelector(".role");
const hostButton = document.querySelector(".hostbutton");
const voteButton = document.querySelector(".vote_button");
const hintImage = document.querySelector(".image");
const topictext = document.querySelector(".topic");
const answertext = document.querySelector(".answer");
var nickname = "hw1";
var userid = socket.io.userid;
let selectedUsername = "";
var isplaying = false;
var myrole = 0; //0은 게임시작전, 1은 호스트, 2는 라이어, 3은 시민
var chatable = true;
var lierphase = false; //
function reset(){
  hostButton.style.display = "none";
  nickname_modify_button.style.visibility = "visible";
  voteButton.disabled = true;
  roleText.textContent="??"
  answertext.textContent = "";
  topictext.textContent = "";
  hintImage.src= "../img/noimg.png";
  isplaying = false;
  myrole = 0;
  chatable = true;
  lierphase = false;
}


function sendchat() {
  if (chatInput.value !== ""&& chatable) {
    const param = {
      name: nickname,
      msg: chatInput.value,
      senderid: userid,
    };
    socket.emit("chatting", param);
    if(lierphase){
      const lieranswer = chatInput.value;
      socket.emit("lieranswer", lieranswer);
    }
    chatInput.value = "";
  }
  
}



function updateUserList(userlist) {
  // 기존 목록 초기화
  user_list.innerHTML = "";
  userlist.forEach((username) => {
    addUser(username);
  });

  // 사용자 아이템 클릭 이벤트 처리
  const userItems = document.querySelectorAll(".user_list .user");
  userItems.forEach((userItem) => {
    userItem.addEventListener("click", () => {
      const previousSelectedUser = document.querySelector(".user_chosen");
      if (previousSelectedUser) {
        previousSelectedUser.classList.remove("user_chosen");
      }
    
      userItem.classList.add("user_chosen");
      selectedUsername = userItem.querySelector(".username").textContent;
      
      console.log(`Selected user: ${selectedUsername}`);
    });
  });
}

function addUser(username) {
  const userItem = document.createElement("li");
  userItem.classList.add("user");
  userItem.innerHTML = `
    <li class = "user">
      <span class="username">${username}</span>
    </li>
  `;
  user_list.appendChild(userItem);
}



function LiModel(name, msg, time, senderid) {
  this.name = name;
  this.msg = msg;
  this.time = time;
  this.senderid = senderid;
  this.addChat = () => {
    const li = document.createElement("li");
    li.classList.add(this.senderid === userid ? "sent" : "received");
    const dom = `<span class="user">${this.name}</span>
      <span class="message"> ${this.msg} </span>
      <span class="time">${this.time}</span>`;
    li.innerHTML = dom;
    chatList.appendChild(li);
  };
}

socket.on("connect", () => {
  userid = socket.id;
  nickname = userid;
  nicknameinput.value = nickname;
  // 서버에 접속한 사용자 정보 전달
  socket.emit("connectUser", nickname);
  
});
// 역할 번경 로그 띄우기
socket.on("assignRole", (role) => {
  voteButton.disabled = false;
  nickname_modify_button.style.visibility = "hidden";
  console.log("Assigned role:", role);
  isplaying = true;
  if(role === "호스트"){
    roleText.textContent=role;
    myrole = 1;
    hostButton.style.display = "block";
  }
  else if(role === "라이어"){
    roleText.textContent=role;
    myrole = 2;
    hostButton.style.display = "none";
  }
  else{
    roleText.textContent="시민";
    myrole = 3;
    hostButton.style.display = "none";
  }
  
})

socket.on("nicknameChanged", ({ sessionId, nickname }) => {
  if (sessionId === socket.id) {
    nicknameText.textContent = nickname; // 변경된 닉네임을 해당 클라이언트에게만 설정
  }
});

socket.on("userList", (data) => {
  updateUserList(data);

});

socket.on("chatting", (data) => {
  console.log(data);
  const { name, msg, time, senderid } = data;
  const chat = new LiModel(name, msg, time, senderid);
  chat.addChat();
  displayContainer.scrollTo(0, displayContainer.scrollHeight);
});

socket.on("lierphase", () => {
  if(myrole != 2){
    chatable = false;
  }
  lierphase = true;
});

socket.on("imguploaded", ({imageUrl, topic, answer}) => {
  let imgUrl;
  console.log(window.location.hostname)
  if (window.location.hostname == "127.0.0.1"||window.location.hostname == "localhost") {
    imgUrl = "http://localhost:5000/uploaded-images/problem.jpg";
  } else {
    imgUrl = imageUrl;
  }
  if(roleText.textContent !== "라이어"){
    hintImage.src= imgUrl;
    answertext.textContent = answer;
  }else{
    let answerlen = answer.length;
    let anstext =""
    for (let i = 0; i < answerlen; i++) {
      anstext += "?";
    }
    answertext.textContent = anstext;
  }
  topictext.textContent = topic;
});

socket.on("gamefin", () => {
  reset();
});



chatInput.addEventListener("keypress", (event) => {
  if (event.keyCode === 13) {
    sendchat();
  }
});

sendButton.addEventListener("click", sendchat);

hostButton.addEventListener("click", () => {
  if(roleText.textContent === "호스트"){
  const popupWindow = window.open("", "_blank", "width=480,height=160");

  popupWindow.document.write(`
      <html>
        <head>
          <title>Image Popup</title>
          <style>
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
            }
            .image_container form {
              display: flex;
              flex-direction: column;
              align-items: center;
            }
          </style>
        </head>
        <body>
          <div class="image_container">
            <form action="/upload" method="post" enctype="multipart/form-data">
              <input type="file" name="image" id="image_input" accept="image/*">
              <span>주제: </span><input type="text" name="topicInput" placeholder="주제">
              <span>정답: </span><input type="text" name="answerInput" placeholder="정답">
              <button type="submit">문제 보내기</button>
            </form>
          </div>
        </body>
      </html>
    `);
    }
  
});

nickname_modify_button.addEventListener("click", () => {
  const newNickname = nicknameinput.value;
  if (newNickname !== "") {
    nickname = newNickname;    
    // 서버에 닉네임 변경 요청 전달
    socket.emit("changeNickname", nickname);
    
  }
});

voteButton.addEventListener("click", () => {
  if(selectedUsername != ""){
    socket.emit("voteUser", selectedUsername);
    voteButton.disabled = true;
  }
})
