import React from "react";
import { useSocket } from "../context/SocketContext";

const VideoControls = () => {
  const {
    callStatus,
    incomingCall,
    activeUser,
    startCall,
    createAnswer,
    rejectCallOnSocket,
    endCallOnSocket,
  } = useSocket();

  // Resolve peer ID — MongoDB uses _id, normalized objects may use id
  const activePeerId = activeUser?.id || activeUser?._id;
  const incomingPeerId = incomingCall?.from;

  const handleStartCall = () => {
    if (activePeerId) {
      startCall(activePeerId);
    } else {
      alert("No contact selected. Go back to chat and select a user first.");
    }
  };

  const handleAccept = () => {
    if (incomingPeerId) {
      createAnswer(incomingPeerId);
    }
  };

  const handleReject = () => {
    if (incomingPeerId) {
      rejectCallOnSocket(incomingPeerId);
    }
  };

  const handleEndCall = () => {
    // Use active peer or incoming caller; fall back to null (local cleanup only)
    const peerId = activePeerId || incomingPeerId || null;
    endCallOnSocket(peerId);
  };

  return (
    <div className="video-controls">

      {/* Incoming call — show Accept + Reject */}
      {callStatus === "ringing" && incomingCall && (
        <>
          <button
            onClick={handleAccept}
            className="btn btn-success"
            style={{ padding: "12px 28px" }}
          >
            ✅ Accept
          </button>
          <button
            onClick={handleReject}
            className="btn btn-danger"
            style={{ padding: "12px 28px" }}
          >
            ❌ Reject
          </button>
        </>
      )}

      {/* Outgoing ringing — show Cancel */}
      {callStatus === "ringing" && !incomingCall && (
        <button
          onClick={handleEndCall}
          className="btn btn-danger"
          style={{ padding: "12px 28px" }}
        >
          ✖ Cancel Call
        </button>
      )}

      {/* Active call — show End Call */}
      {callStatus === "connected" && (
        <button
          onClick={handleEndCall}
          className="btn btn-danger"
          style={{ padding: "12px 28px" }}
        >
          📵 End Call
        </button>
      )}

      {/* Idle — show Start Call */}
      {callStatus === "idle" && (
        <button
          onClick={handleStartCall}
          className="btn btn-primary"
          style={{ padding: "12px 28px" }}
          disabled={!activePeerId}
          title={!activePeerId ? "Select a contact in the chat first" : ""}
        >
          📹 Start Call
        </button>
      )}

    </div>
  );
};

export default VideoControls;
