;(function () {
    'use strict';

    var COLORS = [
        '#e21400', '#91580f', '#f8a700', '#f78b00',
        '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
        '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
    ];

    function trim(str) {
        return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    }

    function formatDate(date) {
        var diff = new Date() - date;
        if (diff < 1000) {
            return 'Just now';
        }

        var sec = Math.floor(diff / 1000);
        if (sec < 60) {
            return sec + ' seconds ago';
        }

        var min = Math.floor(diff / 60000);
        if (min < 60) {
            return min + ' minutes ago';
        }

        var d = date;
        d = [
            '0' + d.getDate(),
            '0' + (d.getMonth() + 1),
            '' + d.getFullYear(),
            '0' + d.getHours(),
            '0' + d.getMinutes()
        ];

        for (var i = 0; i < d.length; i++) {
            d[i] = d[i].slice(-2);
        }

        return d.slice(0, 3).join('.') + ' ' + d.slice(3).join(':');
    }

    // Simple prevent xss
    function cleanInput(input) {
        return input.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // Gets the color of a username through our hash function
    function getUsernameColor(username) {
        // Compute hash code
        var hash = 7;
        for (var i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + (hash << 5) - hash;
        }
        // Calculate color
        var index = Math.abs(hash % COLORS.length);
        return COLORS[index];
    }

    window.onload = function () {
        var socket = io.connect('http://localhost:8008');

        // Initialize variables
        var messages = document.querySelector('.chat-area');
        var messageInput = document.querySelector('.chat-message-input');
        var userNickNameInput = document.querySelector('.nickname-input');
        var usersList = document.querySelector('.users-list');

        var loginPage = document.querySelector('.login-page');
        var chatPage = document.querySelector('.chat-page');

        var username = '';
        var userList = [];
        var connected = false;

        // Sets the client's username
        function setUsername() {
            username = trim(userNickNameInput.value);
            username = cleanInput(username);
            if (userList.indexOf(username) !== -1) {
                var err = document.createElement('div');
                err.classList.add('login-error');
                err.innerHTML = '<strong class="big-text">' + username + '</strong>' + ' nickname already exist, please select another nickname.';
                loginPage.appendChild(err);
                username = '';
            } else {
                loginPage.classList.add('hide-page');
                chatPage.classList.add('show-page');

                socket.emit('add user', username);
            }
        }

        // Sends a chat message
        function sendMessage() {
            var message = trim(messageInput.value);
            message = cleanInput(message);
            // Prevent markup from being injected into the message
            //message = cleanInput(message);
            // if there is a non-empty message and a socket connection
            if (message) {
                messageInput.value = '';
                addChatMessage({
                    username: username,
                    message: message
                });
                // tell server to execute 'new message' and send along one parameter
                socket.emit('new message', message);
            }
        }

        // Adds the visual chat message to the message list
        function addChatMessage(data) {

            var usernameDiv = '<span class="username" style="color:' + getUsernameColor(data.username) + ';">' + data.username + ': </span>';
            var messageBodyDiv = '<span class="messageBody">' + data.message.replace(/\r?\n/g, '<br />') + '</span>';

            var messageDiv = document.createElement('p');

            messageDiv.classList.add('message');

            messageDiv.innerHTML = usernameDiv + messageBodyDiv;
            messages.appendChild(messageDiv);
            messages.scrollTop = messages.scrollHeight;
        }

        // Keyboard events
        document.addEventListener('keydown', function (e) {
            e = e || event;

            if (e.ctrlKey || e.altKey || e.metaKey) return;

            if (e.keyCode == 13 && !e.shiftKey) {
                if (username) {
                    sendMessage();
                } else {
                    setUsername();
                }
                e.preventDefault();
            }
        });

        function putChatHistory(history) {
            var historyLength = history.length;
            for (var i = 0; i < historyLength; i++) {
                addChatMessage(history[i]);
            }
            messages.scrollTop = messages.scrollHeight;
        }

        socket.on('throw user list', function (data) {
            userList = data.userList;
        });

        socket.on('login', function (data) {
            connected = true;
            var message = 'Welcome to chat, ' + username + '!';
            putChatHistory(data.messageHistory);
            log(message);
            addParticipants(data.userList);
        });

        // Whenever the server emits 'new message', update the chat body
        socket.on('new message', function (data) {
            addChatMessage(data);
        });

        // Whenever the server emits 'user joined', log it in the chat body
        socket.on('user joined', function (data) {
            log(formatDate(data.time) + ' ' + data.username + ' joined');
            addParticipants(data.userList);
        });

        // Whenever the server emits 'user left', log it in the chat body
        socket.on('user left', function (data) {
            log(data.username + ' left');
            addParticipants(data.userList);
        });

        function addParticipants(data) {
            usersList.innerHTML = data.join('<br/>');
        }

        // Log a message
        function log(message) {
            var el = document.createElement('div');
            el.classList.add('log');
            el.innerHTML = message;
            messages.appendChild(el);
            messages.scrollTop = messages.scrollHeight;
        }

    };
})();