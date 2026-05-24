import React, { useState, useRef, useEffect } from 'react';

/**
 * AudioTranscriptionButton
 * A highly premium audio recorder & transcriber component for DevControl.
 * Integrates directly with Groq API (whisper-large-v3) in Portuguese.
 * 
 * Props:
 * - onTranscription: callback function (text) triggered when transcription completes successfully.
 * - placeholderText: custom tooltip or description (optional)
 * - className: custom Tailwind classes for container positioning (optional)
 */
export function AudioTranscriptionButton({
  onTranscription,
  placeholderText = "Gravar áudio",
  className = ""
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successPulse, setSuccessPulse] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const errorTimeoutRef = useRef(null);

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      stopTracks();
    };
  }, []);

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    setErrorMessage("");
    audioChunksRef.current = [];
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let options = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        options = { mimeType: 'audio/ogg;codecs=opus' };
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        await uploadAndTranscribe(audioBlob);
        stopTracks();
      };

      recorder.start(250); // Slice chunks every 250ms
      setIsRecording(true);
    } catch (err) {
      console.error('Erro ao acessar o microfone:', err);
      showError("Acesso ao microfone negado ou indisponível.");
      stopTracks();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const showError = (msg) => {
    setErrorMessage(msg);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => {
      setErrorMessage("");
    }, 4000);
  };

  const uploadAndTranscribe = async (audioBlob) => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
      showError("Chave de API da Groq não configurada em VITE_GROQ_API_KEY.");
      return;
    }

    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      // Determine correct extension based on MIME type
      const extension = audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
      formData.append('file', audioBlob, `recording.${extension}`);
      formData.append('model', 'whisper-large-v3');
      formData.append('language', 'pt');
      formData.append('response_format', 'json');

      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `Código de status ${response.status}`);
      }

      const data = await response.json();
      const text = data.text?.trim();

      if (text) {
        onTranscription(text);
        setSuccessPulse(true);
        setTimeout(() => setSuccessPulse(false), 1500);
      } else {
        showError("Nenhuma voz foi detectada no áudio.");
      }
    } catch (err) {
      console.error('Erro na transcrição da Groq:', err);
      showError(`Erro ao transcrever: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleRecording = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isProcessing) return;

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className={`relative inline-flex items-center gap-2 ${className}`}>
      {/* Tooltip / Status Display */}
      {errorMessage && (
        <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 text-[10px] font-medium bg-dn-danger-bg border-[0.5px] border-dn-danger/30 text-dn-danger rounded-md shadow-lg whitespace-nowrap z-50 animate-bounce">
          {errorMessage}
        </span>
      )}

      {isRecording && (
        <div className="absolute right-full mr-2 flex items-center gap-1.5 px-2 py-0.5 bg-dn-accent-10 border-[0.5px] border-dn-accent/30 text-dn-accent rounded-full text-[10px] font-mono whitespace-nowrap z-10">
          <span className="w-1.5 h-1.5 rounded-full bg-dn-accent animate-ping" />
          <span>Gravando...</span>
          
          {/* Waveform Micro-animation */}
          <div className="flex items-end gap-[2px] h-3 ml-1">
            <div className="w-[1.5px] bg-dn-accent rounded-full animate-[soundwave_0.8s_ease-in-out_infinite]" style={{ height: '3px' }} />
            <div className="w-[1.5px] bg-dn-accent rounded-full animate-[soundwave_0.8s_ease-in-out_infinite_0.2s]" style={{ height: '8px' }} />
            <div className="w-[1.5px] bg-dn-accent rounded-full animate-[soundwave_0.8s_ease-in-out_infinite_0.4s]" style={{ height: '5px' }} />
            <div className="w-[1.5px] bg-dn-accent rounded-full animate-[soundwave_0.8s_ease-in-out_infinite_0.1s]" style={{ height: '7px' }} />
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="absolute right-full mr-2 flex items-center gap-1.5 px-2 py-0.5 bg-white/5 border-[0.5px] border-white/10 text-dn-text-secondary rounded-full text-[10px] font-mono whitespace-nowrap z-10">
          <svg className="animate-spin h-3 w-3 text-dn-accent" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Transcrevendo...</span>
        </div>
      )}

      {successPulse && (
        <div className="absolute right-full mr-2 px-2 py-0.5 bg-dn-success-bg border-[0.5px] border-dn-success/30 text-dn-success rounded-full text-[10px] font-mono whitespace-nowrap z-10 animate-pulse">
          Transcrito!
        </div>
      )}

      {/* Style block for soundwave custom keyframes */}
      <style>{`
        @keyframes soundwave {
          0%, 100% { height: 3px; }
          50% { height: 12px; }
        }
      `}</style>

      {/* Main Trigger Button */}
      <button
        type="button"
        onClick={handleToggleRecording}
        disabled={isProcessing}
        title={isRecording ? "Parar gravação e transcrever" : placeholderText}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 relative group
          ${isRecording 
            ? 'bg-dn-danger-bg border-[0.5px] border-dn-danger text-dn-danger shadow-[0_0_12px_rgba(239,68,68,0.4)] animate-pulse' 
            : isProcessing
              ? 'bg-dn-bg-elevated border-[0.5px] border-dn-border text-dn-text-muted cursor-not-allowed'
              : successPulse
                ? 'bg-dn-success-bg border-[0.5px] border-dn-success text-dn-success shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'bg-dn-bg-elevated border-[0.5px] border-dn-border text-dn-text-secondary hover:text-dn-accent hover:border-dn-border-hover hover:shadow-[0_0_8px_rgba(58,191,255,0.25)]'
          }
        `}
      >
        {isRecording ? (
          // Stop icon
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 animate-pulse">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          // Mic icon
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 group-hover:scale-110 transition-transform">
            <path d="M12 1v11a4 4 0 0 0 4-4V5a4 4 0 0 0-8 0v3a4 4 0 0 0 4 4z" />
            <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}

        {/* Ambient Ring Glow */}
        {!isRecording && !isProcessing && !successPulse && (
          <span className="absolute inset-0 rounded-full border border-dn-accent/0 group-hover:border-dn-accent/30 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
        )}
      </button>
    </div>
  );
}
