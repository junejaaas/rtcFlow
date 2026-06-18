import React, { useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import VideoControls from "../components/VideoControls";
import { useNavigate } from "react-router-dom";

const VideoCall = () => {
  const {
    callStatus,
    incomingCall,
    activeUser,
    localVideoRef,
    remoteVideoRef,
    localStream,
    remoteStream,
  } = useSocket();

  const navigate = useNavigate();

  // Sync local stream to the video element whenever it changes
  // (the stream is set by startCall or createAnswer in SocketContext)
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, localVideoRef]);

  useEffect(() => {

  console.log(
    "REMOTE STREAM EFFECT",
    remoteStream
  );

  if (
    remoteVideoRef.current &&
    remoteStream
  ) {

    console.log(
      "ATTACHING REMOTE STREAM"
    );

    remoteVideoRef.current.srcObject =
      remoteStream;

    remoteVideoRef.current
      .play()
      .catch(console.error);

  }

}, [remoteStream]);

  // Sync remote stream to the video element whenever it arrives
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, remoteVideoRef]);

  return (
    <div className="video-container">

      <button
        onClick={() => navigate("/chat")}
        className="btn btn-primary"
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          zIndex: 10
        }}
      >
        ← Back
      </button>

      <h2>Video Call</h2>

      <div className="call-status">

        {callStatus === "idle" && "Ready — select a contact and press Start Call"}

        {callStatus === "ringing" &&
          incomingCall &&
          `📲 Incoming Call from ${incomingCall.username}`}

        {callStatus === "ringing" &&
          !incomingCall &&
          `📞 Calling ${activeUser?.username}…`}

        {callStatus === "connected" &&
          `🟢 Connected with ${activeUser?.username || incomingCall?.username}`}

      </div>

      <div className="video-grid">

        {/* Local (self) video feed */}
        <div className="video-wrapper">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: "100%",
              height: "100%",
              transform: "scaleX(-1)" // mirror self-view
            }}
          />
          <div className="video-label">You</div>
        </div>

        {/* Remote peer video feed */}
        <div className="video-wrapper">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: "100%",
              height: "100%"
            }}
          />
          <div className="video-label">
            {activeUser?.username || incomingCall?.username || "Remote User"}
          </div>
        </div>

      </div>

      <VideoControls />

    </div>
  );
};

export default VideoCall;