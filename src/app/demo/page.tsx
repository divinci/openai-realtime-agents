"use client";
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { TranscriptProvider } from '../contexts/TranscriptContext';
import { EventProvider } from '../contexts/EventContext';
import { useRealtimeSession } from '../hooks/useRealtimeSession';
import { interviewScenario } from '../agentConfigs/interviewScenario';
import { createModerationGuardrail } from '../agentConfigs/guardrails';
import { SessionStatus } from '../types';

function DemoPageContent() {
  const [microphonePermission, setMicrophonePermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const {
    connect,
    disconnect,
    status,
  } = useRealtimeSession();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const el = document.createElement('audio');
      el.autoplay = true;
      el.style.display = 'none';
      document.body.appendChild(el);
      setAudioElement(el);
      
      return () => {
        if (document.body.contains(el)) {
          document.body.removeChild(el);
        }
      };
    }
  }, []);

  const requestMicrophonePermission = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicrophonePermission('granted');
    } catch (error) {
      console.error('Microphone permission denied:', error);
      setMicrophonePermission('denied');
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.mediaDevices) {
      navigator.permissions?.query({ name: 'microphone' as PermissionName })
        .then((result) => {
          if (result.state === 'granted') {
            setMicrophonePermission('granted');
          } else if (result.state === 'denied') {
            setMicrophonePermission('denied');
          } else {
            setMicrophonePermission('pending');
          }
        })
        .catch(() => {
          requestMicrophonePermission();
        });
    }
  }, [requestMicrophonePermission]);

  const fetchEphemeralKey = async (): Promise<string> => {
    const response = await fetch('/api/session', {
      method: 'GET',
    });
    const data = await response.json();
    return data.ephemeral_key;
  };

  const startInterview = useCallback(async () => {
    if (!audioElement) return;

    try {
      const guardrail = createModerationGuardrail('Disney');
      const reorderedAgents = [...interviewScenario];

      await connect({
        getEphemeralKey: fetchEphemeralKey,
        initialAgents: reorderedAgents,
        audioElement,
        outputGuardrails: [guardrail],
      });
    } catch (error) {
      console.error('Failed to start interview:', error);
    }
  }, [connect, audioElement]);

  const restartInterview = useCallback(() => {
    disconnect();
    setTimeout(() => {
      startInterview();
    }, 500);
  }, [disconnect, startInterview]);

  const isStartButtonEnabled = microphonePermission === 'granted' && status === 'DISCONNECTED';
  const isRestartButtonVisible = status === 'CONNECTED' || status === 'CONNECTING';

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-gray-900">
            Disney Runner Interview
          </h1>
          <p className="text-lg text-gray-600">
            Welcome to your voice interview experience
          </p>
        </div>

        {/* Microphone Permission Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              microphonePermission === 'granted' ? 'bg-green-500' : 
              microphonePermission === 'denied' ? 'bg-red-500' : 'bg-yellow-500'
            }`} />
            <span className="text-sm text-gray-700">
              {microphonePermission === 'granted' && 'Microphone ready'}
              {microphonePermission === 'denied' && 'Microphone access denied'}
              {microphonePermission === 'pending' && 'Checking microphone access...'}
            </span>
          </div>

          {microphonePermission === 'pending' && (
            <button
              onClick={requestMicrophonePermission}
              className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Enable Microphone
            </button>
          )}

          {microphonePermission === 'denied' && (
            <div className="space-y-3">
              <p className="text-sm text-red-600">
                Microphone access is required for the voice interview.
                Please enable microphone permissions in your browser settings.
              </p>
              <button
                onClick={requestMicrophonePermission}
                className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Instructions */}
        {microphonePermission === 'granted' && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg text-left">
              <h3 className="font-semibold text-gray-900 mb-2">What to expect:</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• A friendly welcomer will greet you first</li>
                <li>• Say "ready" or "no questions" to begin the interview</li>
                <li>• You'll be automatically transferred to the interviewer</li>
                <li>• Answer the main question about why you want the job</li>
                <li>• The session will end automatically when complete</li>
              </ul>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-4">
          {!isRestartButtonVisible && (
            <button
              onClick={startInterview}
              disabled={!isStartButtonEnabled}
              className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-colors ${
                isStartButtonEnabled
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {status === 'CONNECTING' ? 'Starting Interview...' : 'Start Interview'}
            </button>
          )}

          {isRestartButtonVisible && (
            <button
              onClick={restartInterview}
              className="w-full py-4 px-6 bg-orange-600 text-white rounded-lg font-semibold text-lg hover:bg-orange-700 transition-colors"
            >
              Restart Interview
            </button>
          )}
        </div>

        {/* Status Display */}
        {status !== 'DISCONNECTED' && (
          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                status === 'CONNECTED' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-spin'
              }`} />
              <span className="text-sm text-gray-600">
                {status === 'CONNECTING' && 'Connecting to interview...'}
                {status === 'CONNECTED' && 'Interview in progress'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DemoPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TranscriptProvider>
        <EventProvider>
          <DemoPageContent />
        </EventProvider>
      </TranscriptProvider>
    </Suspense>
  );
}
