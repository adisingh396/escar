import { useState, useEffect, useCallback } from "react";
import { HookList } from "./components/HookList";
import { EventList } from "./components/EventList";
import { EventDetail } from "./components/EventDetail";
import { ReplayModal } from "./components/ReplayModal";
import { HookSettings } from "./components/HookSettings";
import { api } from "./api/client";
import type { Hook, Event } from "./types";

function App() {
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [selectedHook, setSelectedHook] = useState<Hook | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showReplayModal, setShowReplayModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const loadHooks = useCallback(async () => {
    try {
      const data = await api.listHooks();
      setHooks(data);
    } catch (err) {
      console.error("Failed to load hooks:", err);
    }
  }, []);

  useEffect(() => {
    loadHooks();
    // Load config
    api.getConfig().then((config) => {
      setDemoMode(config.demoMode);
    }).catch(() => {
      // Ignore config errors
    });
  }, [loadHooks]);

  const handleCreateHook = async (name: string) => {
    try {
      const hook = await api.createHook({ name });
      setHooks((prev) => [hook, ...prev]);
      setSelectedHook(hook);
    } catch (err) {
      console.error("Failed to create hook:", err);
    }
  };

  const handleDeleteHook = async (hookId: string) => {
    try {
      await api.deleteHook(hookId);
      setHooks((prev) => prev.filter((h) => h.id !== hookId));
      if (selectedHook?.id === hookId) {
        setSelectedHook(null);
        setSelectedEvent(null);
      }
    } catch (err) {
      console.error("Failed to delete hook:", err);
    }
  };

  const handleUpdateHook = (updatedHook: Hook) => {
    setHooks((prev) =>
      prev.map((h) => (h.id === updatedHook.id ? updatedHook : h))
    );
    if (selectedHook?.id === updatedHook.id) {
      setSelectedHook(updatedHook);
    }
  };

  const handleSelectEvent = async (eventId: string) => {
    try {
      const event = await api.getEvent(eventId);
      setSelectedEvent(event);
    } catch (err) {
      console.error("Failed to load event:", err);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await api.deleteEvent(eventId);
      if (selectedEvent?.id === eventId) {
        setSelectedEvent(null);
      }
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  };

  return (
    <div className="app">
      {demoMode && (
        <div className="demo-banner">
          Demo mode - data resets daily. Do not send sensitive webhook payloads.
        </div>
      )}
      <header className="header">
        <div className="brand-mark" aria-hidden="true">E</div>
        <div>
          <h1>Escar</h1>
          <span className="subtitle">Webhook Workbench</span>
        </div>
      </header>
      <main className="main">
        <HookList
          hooks={hooks}
          selectedHook={selectedHook}
          onSelect={setSelectedHook}
          onCreate={handleCreateHook}
          onDelete={handleDeleteHook}
          onSettings={() => setShowSettingsModal(true)}
        />
        <EventList
          hook={selectedHook}
          onSelectEvent={handleSelectEvent}
          selectedEventId={selectedEvent?.id}
          onDeleteEvent={handleDeleteEvent}
        />
        <EventDetail
          event={selectedEvent}
          onReplay={() => setShowReplayModal(true)}
        />
      </main>
      {showReplayModal && selectedEvent && (
        <ReplayModal
          event={selectedEvent}
          onClose={() => setShowReplayModal(false)}
        />
      )}
      {showSettingsModal && selectedHook && (
        <HookSettings
          hook={selectedHook}
          onClose={() => setShowSettingsModal(false)}
          onUpdate={handleUpdateHook}
        />
      )}
    </div>
  );
}

export default App;
