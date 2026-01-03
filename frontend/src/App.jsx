import { useState, useRef, useEffect } from "react";
import {
  Send,
  Mic,
  Smile,
  MoreVertical,
  Check,
  CheckCheck,
  Users,
  Lock,
  Shield,
  UserPlus,
  X,
  AlertCircle,
} from "lucide-react";
import { wsConnection } from "./ws.jsx";

function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isUsernameSet, setIsUsernameSet] = useState(false);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState("");
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [joinError, setJoinError] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [groupExists, setGroupExists] = useState(false);
  const [hostUsername, setHostUsername] = useState("");
  const [joinRequests, setJoinRequests] = useState([]);
  const [isRejected, setIsRejected] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [hostAlerts, setHostAlerts] = useState([]);

  const messagesEndRef = useRef(null);
  const socketUsRef = useRef(null);
  const hasBeenRejectedRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    socketUsRef.current = wsConnection();
    const socket = socketUsRef.current;

    socket.on("connect", () => {
      socket.emit("getGroupStatus");
      hasBeenRejectedRef.current = false;
      setIsRejected(false);
    });

    socket.on("group:status", (status) => {
      setGroupExists(status.hasHost);
      setHostUsername(status.hostUsername);
    });

    socket.on("users:update", (usersList) => {
      setUsers(usersList);
    });

    socket.on("typing:update", (typingList) => {
      setTypingUsers(typingList.filter((u) => u !== currentUser));
    });

    socket.on("join:request", (request) => {
      setJoinRequests((prev) => [
        ...prev,
        {
          id: `request-${request.socketId}`,
          socketId: request.socketId,
          username: request.username,
          timestamp: request.timestamp,
        },
      ]);
    });

    socket.on("request:handled", ({ socketId, action }) => {
      setJoinRequests((prev) =>
        prev.filter((req) => req.socketId !== socketId)
      );
    });

    socket.on("join:pending", (data) => {
      setIsPending(true);
      setCurrentUser(data.username);
      setJoinError(data.message);
      setIsRejected(false);
    });

    socket.on("join:rejected", (data) => {
      hasBeenRejectedRef.current = true;
      setIsRejected(true);
      setIsPending(false);
      setIsUsernameSet(false);
      setIsJoined(false);
      setJoinError(data.message || "Host rejected your join request");
      setCurrentUser("");
    });

    socket.on("join:alert", (data) => {
      const alertId = Date.now();
      setHostAlerts((prev) => [
        ...prev,
        {
          id: alertId,
          username: data.username,
          message: data.message,
          type: data.type || "info",
        },
      ]);

      setTimeout(() => {
        setHostAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
      }, 3000);
    });

    socket.on("group:reset", (data) => {
      setJoinError(`Host (${data.hostUsername}) disconnected. Group closed.`);
      setIsJoined(false);
      setIsUsernameSet(false);
      setIsHost(false);
      setIsPending(false);
      setIsRejected(false);
      hasBeenRejectedRef.current = false;
      setUsers([]);
      setMessages([]);
      setGroupExists(false);
      setHostUsername("");
      setJoinRequests([]);
      setShowPasswordField(false);
      setHostAlerts([]);
    });

    return () => {
      if (socketUsRef.current) socketUsRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    const socket = socketUsRef.current;
    if (!socket) return;

    socket.on("join:success", ({ username, isHost, message }) => {
      if (hasBeenRejectedRef.current) {
        return;
      }

      setJoinError("");
      setIsJoined(true);
      setIsPending(false);
      setIsRejected(false);
      hasBeenRejectedRef.current = false;
      setCurrentUser(username);
      setIsHost(isHost);
      setShowPasswordField(false);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: message,
          username: "System",
          sender: "system",
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    });

    socket.on("join:error", (data) => {
      if (data.message === "Host rejected your join request") {
        setIsRejected(true);
        hasBeenRejectedRef.current = true;
      }
      setJoinError(data.message);
      setIsUsernameSet(false);
      setIsPending(false);
      setIsRejected(false);
      setShowPasswordField(false);
    });

    return () => {
      socket.off("join:success");
      socket.off("join:error");
    };
  }, []);

  useEffect(() => {
    const socket = socketUsRef.current;

    socket.on("message:new", (msg) => {
      setMessages((prev) => [
        ...prev,
        {
          ...msg,
          sender: msg.sender === socket.id ? "me" : "other",
        },
      ]);
    });

    return () => {
      socket.off("message:new");
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleUsernameSubmit = (e) => {
    e.preventDefault();
    const user = username.trim();

    if (!user) {
      setJoinError("Username is required");
      return;
    }

    if (user.length < 3) {
      setJoinError("Username must be at least 3 characters long");
      return;
    }

    const validPattern = /^[a-zA-Z0-9]+$/;
    if (!validPattern.test(user)) {
      setJoinError("Username can only contain letters and numbers");
      return;
    }

    setJoinError("");
    setCurrentUser(user);

    if (groupExists) {
      setShowPasswordField(true);
    } else {
      setShowPasswordField(true);
      setIsUsernameSet(true);
    }
  };

  const handleSendRequest = () => {
    if (!username.trim()) {
      setJoinError("Username is required");
      return;
    }

    const user = username.trim();
    setJoinError("");
    setIsUsernameSet(true);
    setCurrentUser(user);

    socketUsRef.current.emit("joinWithPassword", {
      username: user,
      password: "",
    });
  };

  const handleJoinWithPassword = (e) => {
    e.preventDefault();

    if (isRejected || hasBeenRejectedRef.current) {
      setJoinError(
        "You were rejected from joining this group. Please refresh the page to try again."
      );
      return;
    }

    const user = username.trim();
    const pass = password.trim();

    if (!user || !pass) {
      setJoinError("Username and password required");
      return;
    }

    if (user.length < 3) {
      setJoinError("Username must be at least 3 characters long");
      return;
    }

    const validPattern = /^[a-zA-Z0-9]+$/;
    if (!validPattern.test(user)) {
      setJoinError("Username can only contain letters and numbers");
      return;
    }

    setJoinError("");
    setIsUsernameSet(true);
    setCurrentUser(user);
    setIsRejected(false);
    hasBeenRejectedRef.current = false;

    socketUsRef.current.emit("joinWithPassword", {
      username: user,
      password: pass,
    });
  };

  const handleRequestAction = (socketId, action) => {
    socketUsRef.current.emit("handleJoinRequest", {
      socketId,
      action,
    });
    setJoinRequests((prev) => prev.filter((req) => req.socketId !== socketId));
  };

  const handleDismissRequest = (socketId) => {
    setJoinRequests((prev) => prev.filter((req) => req.socketId !== socketId));
  };

  const handleResetForm = () => {
    window.location.reload();
  };

  const handleBackToUsername = () => {
    setShowPasswordField(false);
    setPassword("");
    setJoinError("");
  };

  const typingTimeout = useRef(null);
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!e.target.value.trim()) {
      socketUsRef.current.emit("stopTyping", currentUser);
      return;
    }
    socketUsRef.current.emit("typing", currentUser);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketUsRef.current.emit("stopTyping", currentUser);
    }, 1500);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now(),
      text: newMessage,
      sender: socketUsRef.current.id,
      username: currentUser,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    socketUsRef.current.emit("sendMessage", message);
    setNewMessage("");
  };

  if (!isJoined || isRejected || hasBeenRejectedRef.current) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-[#0c1317] to-[#202c33] font-ember">
        <div className="bg-[#2a3942] p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-teal-600 flex items-center justify-center mx-auto mb-4">
              {groupExists ? (
                <Lock className="w-10 h-10 text-white" />
              ) : (
                <Shield className="w-10 h-10 text-white" />
              )}
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 font-ember-heavy">
              {groupExists ? "Join Group" : "Create Group"}
            </h1>
            <p className="text-gray-300 font-ember-light">
              {groupExists
                ? `Group created by ${hostUsername}. Enter password or request access.`
                : "Be the first to create the group"}
            </p>
            {joinError && (
              <p
                className={`text-sm mt-2 p-3 rounded-lg font-ember-medium ${
                  isPending
                    ? "text-yellow-400 bg-yellow-900/30 border border-yellow-700/50"
                    : isRejected
                    ? "text-red-400 bg-red-900/30 border border-red-700/50"
                    : "text-red-400 bg-red-900/30 border border-red-700/50"
                }`}
              >
                {joinError}
              </p>
            )}
          </div>

          {!showPasswordField ? (
            <form onSubmit={handleUsernameSubmit} className="space-y-6">
              <div>
                <label className="block text-gray-300 mb-2 text-sm font-ember-medium">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full bg-[#202c33] text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 font-ember"
                  autoFocus
                  disabled={
                    isPending || isRejected || hasBeenRejectedRef.current
                  }
                />
                <p className="text-gray-400 text-xs mt-2 font-ember-light">
                  Only letters and numbers, min 3 characters
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={
                    !username.trim() ||
                    isPending ||
                    isRejected ||
                    hasBeenRejectedRef.current
                  }
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-ember-medium transition-all"
                >
                  {groupExists
                    ? "Continue to Join"
                    : "Continue to Create Group"}
                </button>

                {(isRejected || hasBeenRejectedRef.current) && (
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-ember-medium transition-all"
                  >
                    Refresh Page to Try Again
                  </button>
                )}
              </div>
            </form>
          ) : (
            <form onSubmit={handleJoinWithPassword} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm font-ember-light">Username</p>
                    <p className="text-white font-ember-medium">{username}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleBackToUsername}
                    className="text-teal-400 hover:text-teal-300 text-sm font-ember-medium"
                  >
                    Change
                  </button>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 text-sm font-ember-medium">
                    {groupExists ? "Password (Optional)" : "Create Password"}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      groupExists
                        ? "Enter group password to join directly"
                        : "Set group password"
                    }
                    className="w-full bg-[#202c33] text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 font-ember"
                    disabled={
                      isPending || isRejected || hasBeenRejectedRef.current
                    }
                  />
                  <p className="text-gray-400 text-xs mt-2 font-ember-light">
                    {groupExists
                      ? "Leave empty to send join request. Correct password = join directly."
                      : "This will be the password for your group"}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {groupExists && !password.trim() ? (
                  <button
                    type="button"
                    onClick={handleSendRequest}
                    disabled={
                      isPending || isRejected || hasBeenRejectedRef.current
                    }
                    className="w-full py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-ember-medium transition-all"
                  >
                    Send Join Request
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={
                      !username.trim() ||
                      isPending ||
                      isRejected ||
                      hasBeenRejectedRef.current
                    }
                    className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-ember-medium transition-all"
                  >
                    {groupExists ? "Join Group" : "Create Group"}
                  </button>
                )}

                {(isRejected || hasBeenRejectedRef.current) && (
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-ember-medium transition-all"
                  >
                    Refresh Page to Try Again
                  </button>
                )}
              </div>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-gray-700">
            <p className="text-gray-400 text-sm text-center font-ember-light">
              {isRejected || hasBeenRejectedRef.current
                ? "Your join request was rejected by the host. You cannot join this group."
                : groupExists
                ? !showPasswordField
                  ? "Enter your username to continue"
                  : "Leave password empty to send request, or enter password to join directly"
                : "You'll become the host and manage join requests."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0c1317] font-ember">
      {isHost && hostAlerts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm no-scrollbar">
          {hostAlerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-blue-900/90 backdrop-blur-sm border border-blue-700/70 rounded-lg shadow-2xl p-4 animate-fadeIn"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-blue-300 font-ember-medium mb-1">
                    {alert.username} wants to join
                  </p>
                  <p className="text-white text-sm font-ember">{alert.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isHost && joinRequests.length > 0 && (
        <div className="fixed top-24 right-4 z-50 space-y-3 max-w-sm no-scrollbar">
          {joinRequests.map((request) => (
            <div
              key={request.id}
              className="bg-yellow-900/90 backdrop-blur-sm border border-yellow-700/70 rounded-lg shadow-2xl p-4 animate-fadeIn"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-yellow-400" />
                  <p className="text-yellow-300 font-ember-medium">Join Request</p>
                </div>
                <button
                  onClick={() => handleDismissRequest(request.socketId)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-white mb-4 font-ember">
                <span className="font-ember-bold text-teal-300">
                  {request.username}
                </span>{" "}
                wants to join the group
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    handleRequestAction(request.socketId, "approve")
                  }
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 font-ember-medium"
                >
                  <Check className="w-4 h-4" />
                  Allow
                </button>
                <button
                  onClick={() =>
                    handleRequestAction(request.socketId, "reject")
                  }
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 font-ember-medium"
                >
                  <X className="w-4 h-4" />
                  Reject
                </button>
              </div>

              <div className="text-xs text-gray-300 text-right mt-3 font-ember-light">
                {new Date(request.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between p-4 bg-[#202c33] text-white">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isHost ? "bg-purple-600" : "bg-teal-600"
              }`}
            >
              {isHost ? (
                <Shield className="w-5 h-5" />
              ) : (
                <Users className="w-5 h-5" />
              )}
            </div>
            <span className="absolute -bottom-1 -right-1 bg-green-500 text-xs w-5 h-5 rounded-full flex items-center justify-center font-ember-bold">
              {users.length}
            </span>
          </div>
          <div>
            <h2 className="font-ember-bold">Group Chat</h2>
            <p className="text-sm text-green-400 font-ember-medium">
              {users.length} online • {currentUser} {isHost && "(Host)"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isHost && (joinRequests.length > 0 || hostAlerts.length > 0) && (
            <div className="relative">
              <div className="px-3 py-1 bg-yellow-600 text-white rounded-full text-sm font-ember-medium flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                {joinRequests.length} request{joinRequests.length !== 1 && "s"}
              </div>
              {hostAlerts.length > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full text-xs flex items-center justify-center font-ember-bold">
                  {hostAlerts.length}
                </div>
              )}
            </div>
          )}
          {isHost && (
            <div className="flex items-center gap-2 text-sm text-gray-300 font-ember-medium">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Host
            </div>
          )}
          <MoreVertical className="w-6 h-6 cursor-pointer hover:text-teal-400" />
        </div>
      </div>

      <div className="bg-[#1c252b] px-4 py-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-4 text-white">
          <span className="text-sm text-gray-300 whitespace-nowrap font-ember-light">
            Online ({users.length}):
          </span>
          <div className="flex items-center gap-2 no-scrollbar overflow-x-auto">
            {users.map((user, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                  user === currentUser
                    ? isHost
                      ? "bg-purple-600/20"
                      : "bg-teal-600/20"
                    : "bg-[#2a3942]"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    user === currentUser
                      ? isHost
                        ? "bg-purple-400"
                        : "bg-teal-400"
                      : "bg-green-400"
                  }`}
                ></span>
                <span className="text-sm font-ember-medium">
                  {user} {user === currentUser && isHost && "(Host)"}
                  {user === currentUser && !isHost && "(You)"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {typingUsers.length > 0 && (
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-300">
            <span className="whitespace-nowrap font-ember-light">Typing:</span>
            <div className="flex items-center gap-2 flex-wrap">
              {typingUsers.map((user) => (
                <div key={user} className="flex items-center gap-1">
                  <span className="italic text-teal-300 font-ember-medium">{user}</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-1 bg-teal-400 rounded-full animate-pulse"></span>
                    <span
                      className="w-1 h-1 bg-teal-400 rounded-full animate-pulse"
                      style={{ animationDelay: "0.2s" }}
                    ></span>
                    <span
                      className="w-1 h-1 bg-teal-400 rounded-full animate-pulse"
                      style={{ animationDelay: "0.4s" }}
                    ></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0c1317] bg-opacity-95 no-scrollbar chat-messages-container">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.sender === "me" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md rounded-lg p-3 ${
                msg.sender === "me"
                  ? "bg-[#005c4b] rounded-tr-none"
                  : msg.sender === "system"
                  ? "bg-[#1e3a5f] rounded-lg"
                  : "bg-[#2a3942] rounded-tl-none"
              }`}
            >
              {msg.sender !== "system" && msg.sender !== "me" && (
                <p className="text-teal-300 text-xs font-ember-medium mb-1">
                  {msg.username}
                </p>
              )}
              {msg.sender === "system" && (
                <p className="text-blue-300 text-xs font-ember-medium mb-1">
                  {msg.username}
                </p>
              )}
              <p className="text-white font-ember">{msg.text}</p>
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="text-xs text-gray-300 font-ember-light">{msg.time}</span>
                {msg.sender === "me" && (
                  <span className="text-xs">
                    {msg.read ? (
                      <CheckCheck className="w-3 h-3 text-blue-400" />
                    ) : (
                      <Check className="w-3 h-3 text-gray-400" />
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-[#202c33]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetForm}
            className="p-3 text-gray-400 hover:text-white font-ember-medium"
            title="Leave chat"
          >
            <span className="text-sm">{currentUser}</span>
            {isHost && (
              <Shield className="w-3 h-3 ml-1 text-purple-400 inline" />
            )}
          </button>
          <form
            onSubmit={handleSendMessage}
            className="flex items-center gap-2 flex-1"
          >
            <button
              type="button"
              className="p-3 text-gray-400 hover:text-white"
            >
              <Smile className="w-6 h-6" />
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              placeholder={`Message in Group Chat...`}
              className="flex-1 bg-[#2a3942] text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-teal-500 font-ember"
            />
            {newMessage.trim() ? (
              <button
                type="submit"
                className="p-3 bg-teal-600 text-white rounded-full hover:bg-teal-700"
              >
                <Send className="w-6 h-6" />
              </button>
            ) : (
              <button
                type="button"
                className="p-3 bg-teal-600 text-white rounded-full hover:bg-teal-700"
              >
                <Mic className="w-6 h-6" />
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
