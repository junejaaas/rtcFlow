import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import API from "../api/axios";

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  // App States
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState({}); // mapped by userId -> Message[]
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Call States
  const [callStatus, setCallStatus] = useState("idle"); // 'idle' | 'ringing' | 'connected'
  const [incomingCall, setIncomingCall] = useState(null); // { from: userId, username: string }
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  // WebRTC Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  // Stores the incoming SDP offer from the caller until the user clicks "Accept"
  const pendingOfferRef = useRef(null);

  // ============================================================
  // 1. Initialize user session from stored token on mount
  // ============================================================
  useEffect(() => {
    const initializeUser = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const response = await API.get("/user/me");
          if (response.data.success) {
            setCurrentUser(response.data.user);
          }
        } catch (err) {
          console.error("Failed to authenticate session token:", err);
          localStorage.removeItem("token");
          setCurrentUser(null);
        }
      }
      setLoadingUser(false);
    };
    initializeUser();
  }, []);

  // ============================================================
  // 2. Instantiate Socket.IO client (without auto-connecting)
  // ============================================================
  useEffect(() => {
    const socketInstance = io("https://vmeet-l3ff.onrender.com", {
      autoConnect: false,
    });
    setSocket(socketInstance);
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // ============================================================
  // WEBRTC — Core cleanup function (defined first, no deps)
  // ============================================================

  /**
   * endCallLocal: Stops all local media tracks, closes the RTCPeerConnection,
   * and resets all calling + stream states back to idle.
   */
  const endCallLocal = useCallback(() => {
    console.log("WebRTC: Ending local call and cleaning up resources");

    // Stop all local media tracks to release camera/mic
    const stream = localStreamRef.current;
    if (stream && stream.getTracks) {
      stream.getTracks().forEach((track) => track.stop());
    }
    localStreamRef.current = null;

    // Close the RTCPeerConnection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear any stored pending offer
    pendingOfferRef.current = null;

    // Reset all call-related state to idle
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus("idle");
    setIncomingCall(null);
  }, []);

  // ============================================================
  // SOCKET.IO — Emit helper functions
  // All defined as useCallback so they can be referenced as stable
  // dependencies in the main socket useEffect below.
  // ============================================================

  const registerUserOnSocket = useCallback(
    (userId) => {
      console.log("Socket: Registering user...", userId);
      if (socket) {
        socket.connect();
        socket.emit("register-user", userId);
      }
    },
    [socket]
  );

  const callUserOnSocket = useCallback(
    (recipientId) => {
      console.log(`Socket: Emitting call-user to ${recipientId}`);
      if (socket && currentUser) {
        socket.emit("call-user", {
          callerId: currentUser.id || currentUser._id,
          receiverId: recipientId,
          callerName: currentUser.username,
        });
      }
    },
    [socket, currentUser]
  );

  const acceptCallOnSocket = useCallback(
    (callerId) => {
      console.log(`Socket: Emitting accept-call signal to caller ${callerId}`);
      if (socket && currentUser) {
        socket.emit("accept-call", {
          callerId,
          receiverId: currentUser.id || currentUser._id,
        });
      }
    },
    [socket, currentUser]
  );

  const rejectCallOnSocket = useCallback(
    (callerId) => {
      console.log(`Socket: Rejecting call from ${callerId}`);
      setCallStatus("idle");
      setIncomingCall(null);
      pendingOfferRef.current = null;
      if (socket) {
        socket.emit("reject-call", { callerId });
      }
    },
    [socket]
  );

  const endCallOnSocket = useCallback(
    (peerId) => {
      console.log(`Socket: Ending call with ${peerId}`);
      endCallLocal();
      if (socket && peerId) {
        socket.emit("end-call", { receiverId: peerId });
      }
    },
    [socket, endCallLocal]
  );

  const emitOfferOnSocket = useCallback(
    (peerId, offer) => {
      console.log(`Socket: Emitting SDP offer to ${peerId}`);
      if (socket && currentUser) {
        socket.emit("offer", {
          receiverId: peerId,
          offer,
          callerId: currentUser.id || currentUser._id,
        });
      }
    },
    [socket, currentUser]
  );

  const emitAnswerOnSocket = useCallback(
    (peerId, answer) => {
      console.log(`Socket: Emitting SDP answer to ${peerId}`);
      if (socket && currentUser) {
        socket.emit("answer", {
          receiverId: peerId,
          answer,
          callerId: currentUser.id || currentUser._id,
        });
      }
    },
    [socket, currentUser]
  );

  const emitIceCandidateOnSocket = useCallback(
    (peerId, candidate) => {
      console.log(`Socket: Emitting ICE candidate to ${peerId}`);
      if (socket && currentUser) {
        socket.emit("ice-candidate", {
          receiverId: peerId,
          candidate,
          senderId: currentUser.id || currentUser._id,
        });
      }
    },
    [socket, currentUser]
  );

  const sendMessageOnSocket = useCallback(
    (recipientId, text) => {
      const senderId = currentUser?.id || currentUser?._id;
      console.log(`Socket: Sending message to ${recipientId} -> "${text}"`);

      // Optimistically add message to local state
      const newMsg = {
        _id: `msg-local-${Date.now()}`,
        sender: senderId,
        receiver: recipientId,
        text,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => ({
        ...prev,
        [recipientId]: [...(prev[recipientId] || []), newMsg],
      }));

      if (socket) {
        socket.emit("send-message", {
          senderId,
          receiverId: recipientId,
          message: text,
        });
      }
    },
    [socket, currentUser]
  );

  // ============================================================
  // WEBRTC — RTCPeerConnection factory
  // ============================================================

  /**
   * createPeerConnection: Instantiates an RTCPeerConnection with STUN servers,
   * binds ICE and track event handlers, and attaches local media tracks.
   *
   * @param {string} peerId - The remote user's ID (used for ICE candidate routing)
   * @param {MediaStream} stream - Local media stream to add to the connection
   * @returns {RTCPeerConnection}
   */
  const createPeerConnection = useCallback(
    (peerId, stream) => {
      console.log("WebRTC: Creating RTCPeerConnection for peer:", peerId);

      const rtcConfig = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      };

      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      // Gather local ICE candidates and relay them to the remote peer
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("WebRTC: Local ICE candidate gathered — relaying to peer:", peerId);
          emitIceCandidateOnSocket(peerId, event.candidate);
        }
      };

      // Attach remote media stream when tracks arrive from the peer
      pc.ontrack = (event) => {

  console.log(
    "REMOTE TRACK RECEIVED",
    event.streams[0]
  );

  const remoteMediaStream =
    event.streams[0];

  setRemoteStream(remoteMediaStream);

  setTimeout(() => {

    if (remoteVideoRef.current) {

      remoteVideoRef.current.srcObject =
        remoteMediaStream;

      remoteVideoRef.current
        .play()
        .then(() => {
          console.log(
            "REMOTE VIDEO PLAYING"
          );
        })
        .catch(console.error);

    }

  }, 100);

};
    pc.oniceconnectionstatechange = () => {
      console.log(
        "ICE CONNECTION STATE:",
        pc.iceConnectionState
      );
    };

    pc.onicegatheringstatechange = () => {
      console.log(
        "ICE GATHERING STATE:",
        pc.iceGatheringState
      );
    };

      // Monitor connection health and clean up on unexpected disconnect
      pc.onconnectionstatechange = () => {
        console.log("WebRTC: Connection state:", pc.connectionState);
        if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          endCallLocal();
        }
      };

      // Attach all local media tracks to the peer connection
      const activeStream = stream || localStreamRef.current;
      if (activeStream) {
        activeStream.getTracks().forEach((track) => {
          pc.addTrack(track, activeStream);
        });
      }

      return pc;
    },
    [emitIceCandidateOnSocket, endCallLocal]
  );

  // ============================================================
  // WEBRTC — Call flow functions
  // ============================================================

  /**
   * startCall: Initiated by the CALLER when they press "Start Call".
   * Captures local media → creates RTCPeerConnection → generates SDP offer →
   * setLocalDescription → emits offer + call-user ringing signal to callee.
   *
   * @param {string} recipientId - The remote user's ID to call
   */
  const startCall = useCallback(
    async (recipientId) => {
      console.log("WebRTC: Caller initiating call to:", recipientId);
      setCallStatus("ringing");

      try {
        // Step 1: Request camera and microphone permissions
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Step 2: Create RTCPeerConnection and attach local tracks
        const pc = createPeerConnection(recipientId, stream);

        // Step 3: Generate SDP offer describing local capabilities
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Step 4: Send SDP offer to callee via signaling server
        emitOfferOnSocket(recipientId, offer);

        // Step 5: Trigger ringing notification on callee's device
        callUserOnSocket(recipientId);
      } catch (error) {
        console.error("WebRTC Error: Failed to initiate call:", error);
        endCallLocal();
      }
    },
    [createPeerConnection, endCallLocal, emitOfferOnSocket, callUserOnSocket]
  );

  /**
   * handleOffer: Socket event handler — fired on the CALLEE side when the
   * caller's SDP offer arrives over the signaling channel.
   * Stores the offer in a ref; the actual WebRTC exchange begins only
   * when the user explicitly accepts via createAnswer().
   *
   * @param {Object} data - { offer: RTCSessionDescriptionInit, callerId: string }
   */
  const handleOffer = useCallback((data) => {
    console.log("Signaling received: SDP offer stored — awaiting user acceptance", data);
    // Hold the offer until the user clicks Accept
    pendingOfferRef.current = data;
  }, []);

  /**
   * createAnswer: Triggered by the CALLEE clicking "Accept Call" in the UI.
   * Captures local media → creates RTCPeerConnection → sets the stored remote
   * SDP offer → generates SDP answer → setLocalDescription → emits answer back
   * to the caller → signals acceptance.
   *
   * @param {string} callerId - The remote caller's user ID
   */
  const createAnswer = useCallback(
    async (callerId) => {
      console.log("WebRTC: Callee accepting call from:", callerId);

      const pendingData = pendingOfferRef.current;

      try {
        // Step 1: Request camera and microphone permissions
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Step 2: Create RTCPeerConnection and attach local tracks
        const pc = createPeerConnection(callerId, stream);

        // Step 3: Apply the caller's SDP offer as the remote description
        if (pendingData && pendingData.offer) {
          await pc.setRemoteDescription(
            new RTCSessionDescription(pendingData.offer)
          );
        } else {
          console.warn(
            "WebRTC: No pending offer found — callee accepted before offer arrived"
          );
        }

        // Step 4: Generate SDP answer describing callee's capabilities
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Step 5: Send SDP answer back to the caller
        emitAnswerOnSocket(callerId, answer);

        // Step 6: Notify caller that the call has been accepted
        acceptCallOnSocket(callerId);

        // Step 7: Mark call as connected and clear pending state
        setCallStatus("connected");
        setIncomingCall(null);
        pendingOfferRef.current = null;
      } catch (error) {
        console.error("WebRTC Error: Failed to accept call / create answer:", error);
        rejectCallOnSocket(callerId);
        endCallLocal();
      }
    },
    [
      createPeerConnection,
      endCallLocal,
      emitAnswerOnSocket,
      acceptCallOnSocket,
      rejectCallOnSocket,
    ]
  );

  /**
   * handleAnswer: Socket event handler — fired on the CALLER side when the
   * callee's SDP answer arrives. Sets the remote description to complete
   * the WebRTC handshake and transitions call status to connected.
   *
   * @param {Object} data - { answer: RTCSessionDescriptionInit, callerId: string }
   */
  const handleAnswer = useCallback(async (data) => {
    console.log("Signaling received: SDP answer from callee", data);
    const { answer } = data;
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
        console.log("WebRTC: Remote description set — P2P connection establishing...");
        setCallStatus("connected");
      }
    } catch (error) {
      console.error("WebRTC Error: Failed to set remote description from answer:", error);
    }
  }, []);

  /**
   * handleIceCandidate: Socket event handler — fired when a remote ICE candidate
   * arrives. Adds it to the active RTCPeerConnection to assist in finding the
   * best network path between peers.
   *
   * @param {Object} data - { candidate: RTCIceCandidateInit, senderId: string }
   */
  const handleIceCandidate = useCallback(async (data) => {
    console.log("Signaling received: Remote ICE candidate", data);
    const { candidate } = data;
    try {
      if (peerConnectionRef.current && candidate) {
        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      }
    } catch (error) {
      console.error("WebRTC Error: Failed to add remote ICE candidate:", error);
    }
  }, []);

  // ============================================================
  // CALL STATE — Signaling event handlers
  // ============================================================

  const handleIncomingCall = useCallback((data) => {
    console.log("Signaling received: Incoming call event", data);
    setIncomingCall({
      from: data.callerId,
      username: data.callerName || "Unknown Caller",
    });
    setCallStatus("ringing");
  }, []);

  /**
   * handleCallAccepted: Received by the CALLER when the callee signals acceptance.
   * No WebRTC action needed here — the actual P2P connection finalizes via the
   * "answer" socket event which triggers handleAnswer → setRemoteDescription.
   */
  const handleCallAccepted = useCallback((data) => {
    console.log(
      "Signaling received: Callee accepted — awaiting SDP answer to finalize connection",
      data
    );
    // Connection state will update to 'connected' once handleAnswer resolves.
  }, []);

  const handleCallRejected = useCallback(() => {
    console.log("Signaling received: Call rejected by peer");
    endCallLocal();
  }, [endCallLocal]);

  const handleCallEnded = useCallback(() => {
    console.log("Signaling received: Call ended by peer");
    endCallLocal();
  }, [endCallLocal]);

  // ============================================================
  // DATA — Chat history
  // ============================================================

  const fetchChatHistory = async (receiverId) => {
    try {
      const response = await API.get(`/messages/${receiverId}`);
      setMessages((prev) => ({
        ...prev,
        [receiverId]: response.data,
      }));
    } catch (err) {
      console.error("Failed to fetch chat history:", err);
    }
  };

  // Auto-fetch chat history when the active chat partner changes
  useEffect(() => {
    if (activeUser) {
      const activeUserId = activeUser.id || activeUser._id;
      fetchChatHistory(activeUserId);
    }
  }, [activeUser]);

  // ============================================================
  // 3. Socket.IO lifecycle — connect, register, bind all events
  //    All handlers are stable useCallback refs, so this effect
  //    correctly re-runs only when socket or currentUser changes.
  // ============================================================
  useEffect(() => {
    if (!socket || !currentUser) return;

    const userId = currentUser.id || currentUser._id;
    socket.connect();
    socket.emit("register-user", userId);

    // Re-register on reconnect to restore server-side mapping
    const onConnect = () => {
      console.log("Socket.IO: Connected to signaling server");
      socket.emit("register-user", userId);
    };

    const onOnlineUsers = (usersList) => setOnlineUsers(usersList);

    const onReceiveMessage = (data) => {
      console.log("Socket: Incoming message:", data);
      const otherUserId =
        data.senderId === userId ? data.receiverId : data.senderId;
      const newMsg = {
        _id: data._id || `msg-${Date.now()}`,
        sender: data.senderId,
        receiver: data.receiverId,
        text: data.message,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => ({
        ...prev,
        [otherUserId]: [...(prev[otherUserId] || []), newMsg],
      }));
    };

    socket.on("connect", onConnect);
    socket.on("online-users", onOnlineUsers);
    socket.on("receive-message", onReceiveMessage);

    // WebRTC signaling events — wired to the real handler functions above
    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-accepted", handleCallAccepted);
    socket.on("call-rejected", handleCallRejected);
    socket.on("call-ended", handleCallEnded);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);

    return () => {
      socket.off("connect", onConnect);
      socket.off("online-users", onOnlineUsers);
      socket.off("receive-message", onReceiveMessage);
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-accepted", handleCallAccepted);
      socket.off("call-rejected", handleCallRejected);
      socket.off("call-ended", handleCallEnded);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);
      socket.disconnect();
      setOnlineUsers([]);
    };
  }, [
    socket,
    currentUser,
    handleIncomingCall,
    handleCallAccepted,
    handleCallRejected,
    handleCallEnded,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
  ]);

  return (
    <SocketContext.Provider
      value={{
        // Auth
        socket,
        currentUser,
        setCurrentUser,
        loadingUser,

        // Users & chat
        users,
        setUsers,
        activeUser,
        setActiveUser,
        messages,
        setMessages,
        onlineUsers,
        fetchChatHistory,

        // Call state
        callStatus,
        setCallStatus,
        incomingCall,
        setIncomingCall,
        localStream,
        remoteStream,

        // Video element refs (attach directly in video components)
        localVideoRef,
        remoteVideoRef,

        // Socket emit methods
        registerUserOnSocket,
        sendMessageOnSocket,
        callUserOnSocket,
        acceptCallOnSocket,
        rejectCallOnSocket,
        endCallOnSocket,
        emitOfferOnSocket,
        emitAnswerOnSocket,
        emitIceCandidateOnSocket,

        // WebRTC call methods
        startCall,       // Caller: initiate call
        createAnswer,    // Callee: accept call & complete SDP exchange
        handleOffer,     // Exposed for manual testing if needed
        handleAnswer,    // Exposed for manual testing if needed
        handleIceCandidate,
        endCallLocal,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
