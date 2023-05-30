"use strict";

const socket = io();
const nicknameinput = document.querySelector("#nickname");
const user_list = document.querySelector(".user_list");
const chatList = document.querySelector(".chatting_list");
const chatInput = document.querySelector(".chatting_input");
const sendButton = document.querySelector(".send_button");
const nickname_modify_button = document.querySelector(".nickname_modify_button");
const displayContainer = document.querySelector(".display_container");
const popupButton = document.querySelector(".popup_button");
const roleText = document.querySelector(".role");
const hostButton = document.querySelector(".hostbutton");

var nickname = "hw1";
var userid = socket.io.userid;



socket.on("connect", () => {
  userid = socket.id;
  nickname = userid;
  nicknameinput.value = nickname;
  // 서버에 접속한 사용자 정보 전달
  socket.emit("connectUser", nickname);
});

nickname_modify_button.addEventListener("click", () => {
  roleText.textContent="범인"//텍스트 바꾸는거!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  const newNickname = nicknameinput.value;
  if (newNickname !== "") {
    nickname = newNickname;
    // 서버에 닉네임 변경 요청 전달
    socket.emit("changeNickname", nickname);
  }
});

chatInput.addEventListener("keypress", (event) => {
  if (event.keyCode === 13) {
    sendchat();
  }
});

sendButton.addEventListener("click", sendchat);

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
hostButton.addEventListener("click", () => {
  const popupWindow = window.open("", "_blank", "width=1280,height=960");

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
            img {
              max-width: 100%;
              max-height: 100%;
            }
          </style>
        </head>
        <body>
          <div class="image_container">
            <button class="popup_button">이미지 보기</button>
            <form action="/upload" method="post" enctype="multipart/form-data">
              <input type="file" name="image" id="image_input" accept="image/*">
              <button type="submit">이미지 보내기</button>
            </form>
          </div>
        </body>
      </html>
    `);
  
});
popupButton.addEventListener("click", () => {
    const imageUrl = "http://localhost:5000/uploaded-images/problem.jpg";
    openImagePopup(imageUrl);
});
  
function sendchat() {
  if (chatInput.value !== "") {
    const param = {
      name: nickname,
      msg: chatInput.value,
      senderid: userid,
    };
    chatInput.value = "";
    socket.emit("chatting", param);
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
      const selectedUsername = userItem.querySelector(".username").textContent;
      // 선택한 사용자 처리 로직 작성
      console.log(`Selected user: ${selectedUsername}`);
    });
  });
}

function addUser(username) {
  const userItem = document.createElement("li");
  userItem.classList.add("user");
  userItem.innerHTML = `
    <span class="username">${username}</span>
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
    const dom = `<span class="user">${this.name}:</span>
      <span class="message">${this.msg}</span>
      <span class="time">${this.time}</span>`;
    li.innerHTML = dom;
    chatList.appendChild(li);
  };
}

function openImagePopup(imageUrl) {
    const popupWindow = window.open("", "_blank", "width=600,height=600");
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
            img {
              max-width: 100%;
              max-height: 100%;
            }
          </style>
        </head>
        <body>
          <img src="${imageUrl}" alt="Image">
        </body>
      </html>
    `);
}
