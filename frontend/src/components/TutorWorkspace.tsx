import React, { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  TutorConversationItem,
  TutorMessageItem,
  MaterialItem,
  ConceptItem,
  ConceptMasteryItem,
} from "../api/client";
import MarkdownContent from "./MarkdownContent";
import {
  Send,
  Sparkles,
  Bot,
  User,
  Plus,
  Loader2,
  AlertCircle,
  FileText,
  PanelRightClose,
  PanelRightOpen,
  ChevronRight,
  Award,
  MessageSquare,
} from "lucide-react";

interface TutorWorkspaceProps {
  projectId: string;
  projectName: string;
  materials: MaterialItem[];
}

export default function TutorWorkspace({
  projectId,
  projectName,
  materials,
}: TutorWorkspaceProps) {
  const queryClient = useQueryClient();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [questionInput, setQuestionInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [tutorError, setTutorError] = useState<string | null>(null);
  const [showContextPanel, setShowContextPanel] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Queries
  const { data: conversations = [] } = useQuery<TutorConversationItem[]>({
    queryKey: ["tutor-conversations", projectId],
    queryFn: () => api.tutor.listConversations(projectId),
    enabled: !!projectId,
  });

  const { data: concepts = [] } = useQuery<ConceptItem[]>({
    queryKey: ["project-concepts", projectId],
    queryFn: () => api.mastery.getConcepts(projectId),
    enabled: !!projectId,
  });

  const { data: masteries = [] } = useQuery<ConceptMasteryItem[]>({
    queryKey: ["project-mastery", projectId],
    queryFn: () => api.mastery.getMastery(projectId),
    enabled: !!projectId,
  });

  // Active conversation ID fallback
  const activeConversationId =
    selectedConversationId || (conversations.length > 0 ? conversations[0].id : null);

  const { data: activeConversation } = useQuery<TutorConversationItem | null>({
    queryKey: ["tutor-conversation", activeConversationId],
    queryFn: () => (activeConversationId ? api.tutor.getConversation(activeConversationId) : null),
    enabled: !!activeConversationId,
  });

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages, isAsking]);

  const handleCreateNewConversation = async () => {
    try {
      const newConv = await api.tutor.createConversation(projectId, "New Study Session");
      setSelectedConversationId(newConv.id);
      queryClient.invalidateQueries({ queryKey: ["tutor-conversations", projectId] });
      if (textareaRef.current) textareaRef.current.focus();
    } catch (err: any) {
      setTutorError(err.message || "Failed to create new conversation");
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const text = (customPrompt || questionInput).trim();
    if (!text || isAsking) return;

    setQuestionInput("");
    setTutorError(null);
    setIsAsking(true);

    try {
      let convId = activeConversationId;
      if (!convId) {
        const titleSnippet = text.length > 30 ? text.slice(0, 30) + "..." : text;
        const newConv = await api.tutor.createConversation(projectId, titleSnippet);
        convId = newConv.id;
        setSelectedConversationId(newConv.id);
        await queryClient.invalidateQueries({ queryKey: ["tutor-conversations", projectId] });
      }

      await api.tutor.sendMessage(convId, text);
      await queryClient.invalidateQueries({ queryKey: ["tutor-conversation", convId] });
      await queryClient.invalidateQueries({ queryKey: ["tutor-conversations", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-mastery", projectId] });
    } catch (err: any) {
      setTutorError(err.message || "Failed to receive answer from AI Tutor");
    } finally {
      setIsAsking(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const starterPrompts = [
    "Summarize the key core concepts from the uploaded study material.",
    "Explain the most challenging technical concepts with practical examples.",
    "What are the prerequisite fundamentals I need to master this topic?",
  ];

  const messages = activeConversation?.messages || [];

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-14rem)] min-h-[580px] max-h-[900px]">
      {/* Center: Main Tutor Chat Workspace */}
      <div className="flex-1 flex flex-col rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] overflow-hidden shadow-xs min-w-0 transition-colors duration-200">
        {/* Tutor Header */}
        <div className="px-5 py-3.5 border-b border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6C5CE7] to-[#8175F5] flex items-center justify-center shadow-sm shadow-[#6C5CE7]/25 shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[#172033] dark:text-[#F4F5F7] truncate">AI Study Tutor</h3>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Grounded RAG
                </span>
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] border border-[#6C5CE7]/30 dark:border-[#8175F5]/30">
                  <Sparkles className="w-3 h-3" />
                  Gemini 2.5 Flash
                </span>
              </div>
              <p className="text-xs text-[#667085] dark:text-[#A7B0C0] truncate">
                {activeConversation ? activeConversation.title : "Grounded in project materials"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Conversation Selector / New Button */}
            <button
              onClick={handleCreateNewConversation}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#6C5CE7] dark:bg-[#8175F5] hover:bg-[#5B4DD6] dark:hover:bg-[#9187FF] text-white text-xs font-semibold transition shadow-sm shadow-[#6C5CE7]/20 shrink-0 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Session</span>
            </button>

            {/* Toggle Side Context Panel */}
            <button
              onClick={() => setShowContextPanel(!showContextPanel)}
              className="hidden lg:flex p-2 rounded-xl bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] text-[#667085] dark:text-[#A7B0C0] hover:text-[#172033] dark:hover:text-[#F4F5F7] transition"
              title={showContextPanel ? "Collapse Context Panel" : "Expand Context Panel"}
            >
              {showContextPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Chat Messages Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#F5F7FB] dark:bg-[#0B1020] transition-colors duration-200">
          {messages.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-5 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-[#F0EDFF] dark:bg-[#211D42] border border-[#6C5CE7]/30 dark:border-[#8175F5]/30 flex items-center justify-center shadow-sm">
                <Bot className="w-7 h-7 text-[#6C5CE7] dark:text-[#8175F5]" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base font-bold text-[#172033] dark:text-[#F4F5F7]">Ask your Socratic AI Tutor</h4>
                <p className="text-xs text-[#667085] dark:text-[#A7B0C0] leading-relaxed">
                  Answers are strictly grounded in your uploaded project materials with exact page citations.
                </p>
              </div>

              {/* Suggested Starter Pills */}
              <div className="w-full space-y-2 pt-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#98A2B3] dark:text-[#7F8AA0] text-left">
                  Suggested Prompts
                </p>
                {starterPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="w-full text-left p-3.5 rounded-xl bg-white dark:bg-[#121A2D] hover:bg-[#F0EDFF] dark:hover:bg-[#211D42] border border-[#E3E6EF] dark:border-[#26324B] hover:border-[#6C5CE7]/40 dark:hover:border-[#8175F5]/40 text-xs text-[#172033] dark:text-[#F4F5F7] transition group flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <span className="group-hover:text-[#6C5CE7] dark:group-hover:text-[#8175F5] font-medium transition leading-relaxed">{prompt}</span>
                    <ChevronRight className="w-4 h-4 text-[#98A2B3] dark:text-[#7F8AA0] group-hover:text-[#6C5CE7] dark:group-hover:text-[#8175F5] shrink-0 transition" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message Stream */
            messages.map((msg: TutorMessageItem) => {
              const isAssistant = msg.role === "assistant";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3.5 ${isAssistant ? "justify-start" : "justify-end"} max-w-4xl mx-auto`}
                >
                  {isAssistant && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6C5CE7] to-[#8175F5] flex items-center justify-center text-white shrink-0 mt-1 shadow-sm shadow-[#6C5CE7]/20">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`rounded-2xl p-4 sm:p-5 max-w-[85%] sm:max-w-[78%] space-y-3 shadow-2xs ${
                      isAssistant
                        ? "bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] text-[#172033] dark:text-[#F4F5F7]"
                        : "bg-[#F0EDFF] dark:bg-[#211D42] border border-[#6C5CE7]/30 dark:border-[#8175F5]/30 text-[#172033] dark:text-[#F4F5F7] ml-auto font-medium"
                    }`}
                  >
                    {isAssistant ? (
                      <>
                        <MarkdownContent content={msg.content} />

                        {/* Citation Chips */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="pt-3 mt-3 border-t border-[#E3E6EF] dark:border-[#26324B] flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-bold text-[#667085] dark:text-[#A7B0C0] flex items-center gap-1 mr-1">
                              <FileText className="w-3.5 h-3.5 text-[#6C5CE7] dark:text-[#8175F5]" />
                              Sources:
                            </span>
                            {msg.citations.map((c, cIdx) => (
                              <div
                                key={cIdx}
                                data-testid="tutor-citation"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white dark:bg-[#18223A] text-[#6C5CE7] dark:text-[#8175F5] border border-[#6C5CE7]/30 dark:border-[#8175F5]/40 shadow-2xs"
                                title={c.supporting_text || undefined}
                              >
                                Page {c.page_number}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Grounded Refusal Indicator */}
                        {(msg.content.toLowerCase().includes("couldn't find") ||
                          msg.content.toLowerCase().includes("not mentioned") ||
                          msg.content.toLowerCase().includes("not found")) && (
                          <div className="pt-2.5 mt-2.5 border-t border-[#E3E6EF] dark:border-[#26324B] flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                              <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              Grounded Refusal
                            </span>
                            <span className="text-[11px] text-[#667085] dark:text-[#A7B0C0]">
                              Out of scope of uploaded study materials
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>

                  {!isAssistant && (
                    <div className="w-8 h-8 rounded-full bg-[#F0EDFF] dark:bg-[#211D42] border border-[#6C5CE7]/30 dark:border-[#8175F5]/30 flex items-center justify-center text-[#6C5CE7] dark:text-[#8175F5] font-bold text-xs shrink-0 mt-1">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Thinking / Typing Indicator */}
          {isAsking && (
            <div className="flex gap-3.5 justify-start max-w-4xl mx-auto">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6C5CE7] to-[#8175F5] flex items-center justify-center text-white shrink-0 mt-1 shadow-sm shadow-[#6C5CE7]/20">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="rounded-2xl px-4 py-3.5 bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] text-xs text-[#667085] dark:text-[#A7B0C0] flex items-center gap-2.5 shadow-2xs">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#6C5CE7] dark:bg-[#8175F5] animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-[#6C5CE7] dark:bg-[#8175F5] animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-[#6C5CE7] dark:bg-[#8175F5] animate-bounce [animation-delay:0.4s]" />
                </div>
                <span className="font-semibold text-[#172033] dark:text-[#F4F5F7]">Synthesizing grounded answer from project materials...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error Banner */}
        {tutorError && (
          <div className="mx-4 mb-2 p-3.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <div className="flex-1 leading-relaxed">
              <strong className="font-bold text-rose-800 dark:text-rose-300">Unable to complete request:</strong> {tutorError}
            </div>
          </div>
        )}

        {/* Input Composer */}
        <div className="p-3.5 sm:p-4 border-t border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] transition-colors duration-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2.5 rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-[#FAF9FF] dark:bg-[#18223A] p-2 focus-within:bg-white dark:focus-within:bg-[#121A2D] focus-within:border-[#6C5CE7] dark:focus-within:border-[#8175F5] focus-within:ring-2 focus-within:ring-[#6C5CE7]/20 transition shadow-2xs"
          >
            <textarea
              ref={textareaRef}
              id="tutor-question-input"
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your tutor anything from your study materials... (Enter to send, Shift+Enter for new line)"
              rows={1}
              className="flex-1 bg-transparent px-3 py-2 text-sm text-[#172033] dark:text-[#F4F5F7] placeholder:text-[#98A2B3] dark:placeholder:text-[#7F8AA0] focus:outline-none resize-none max-h-32 min-h-[42px]"
            />
            <button
              type="submit"
              id="tutor-send-btn"
              disabled={!questionInput.trim() || isAsking}
              className="p-3 rounded-xl bg-[#6C5CE7] dark:bg-[#8175F5] hover:bg-[#5B4DD6] dark:hover:bg-[#9187FF] disabled:bg-[#FAF9FF] dark:disabled:bg-[#18223A] text-white disabled:text-[#98A2B3] dark:disabled:text-[#7F8AA0] transition shadow-sm shadow-[#6C5CE7]/25 disabled:shadow-none shrink-0 active:scale-95 disabled:cursor-not-allowed"
              title="Send Message"
            >
              {isAsking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
          <div className="flex items-center justify-between px-2 pt-2 text-[11px] text-[#667085] dark:text-[#A7B0C0]">
            <span>Powered by Google Gemini 2.5 Flash</span>
            <span className="hidden sm:inline font-medium">Press Enter ↵ to send</span>
          </div>
        </div>
      </div>

      {/* Right: Project Context & Knowledge Panel */}
      {showContextPanel && (
        <aside className="w-full lg:w-72 rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] p-4 sm:p-5 space-y-5 overflow-y-auto shrink-0 shadow-xs transition-colors duration-200">
          {/* Sessions List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#172033] dark:text-[#F4F5F7]">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#6C5CE7] dark:text-[#8175F5]" />
                Session History
              </span>
              <span className="text-[11px] text-[#667085] dark:text-[#A7B0C0] font-mono">{conversations.length}</span>
            </div>
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {conversations.map((conv) => {
                const isCurrent = conv.id === activeConversationId;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversationId(conv.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs transition truncate block ${
                      isCurrent
                        ? "bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] font-bold border border-[#6C5CE7]/30 dark:border-[#8175F5]/30"
                        : "text-[#667085] dark:text-[#A7B0C0] hover:bg-[#FAF9FF] dark:hover:bg-[#18223A] hover:text-[#172033] dark:hover:text-[#F4F5F7] border border-transparent"
                    }`}
                  >
                    {conv.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Uploaded Materials Summary */}
          <div className="space-y-2 border-t border-[#E3E6EF] dark:border-[#26324B] pt-4">
            <div className="flex items-center justify-between text-xs font-bold text-[#172033] dark:text-[#F4F5F7]">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#6C5CE7] dark:text-[#8175F5]" />
                Project Documents
              </span>
              <span className="text-[11px] text-[#667085] dark:text-[#A7B0C0] font-mono">{materials.length}</span>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
              {materials.length === 0 ? (
                <p className="text-xs text-[#667085] dark:text-[#A7B0C0] italic">No project PDFs indexed yet.</p>
              ) : (
                materials.map((m, mIdx) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-xl bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] text-xs text-[#172033] dark:text-[#F4F5F7] space-y-1"
                  >
                    <p className="font-semibold truncate text-[#172033] dark:text-[#F4F5F7]">Document #{mIdx + 1}</p>
                    <div className="flex items-center justify-between text-[11px] text-[#667085] dark:text-[#A7B0C0]">
                      <span>{m.page_count ? `${m.page_count} pages` : "Processing"}</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">{m.status === "READY" ? "Indexed" : m.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Concepts & Mastery Overview */}
          <div className="space-y-2 border-t border-[#E3E6EF] dark:border-[#26324B] pt-4">
            <div className="flex items-center justify-between text-xs font-bold text-[#172033] dark:text-[#F4F5F7]">
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-[#6C5CE7] dark:text-[#8175F5]" />
                Concepts Overview
              </span>
              <span className="text-[11px] text-[#667085] dark:text-[#A7B0C0] font-mono">{concepts.length}</span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {concepts.length === 0 ? (
                <p className="text-xs text-[#667085] dark:text-[#A7B0C0] italic">Concepts will appear as you study.</p>
              ) : (
                concepts.slice(0, 5).map((concept) => {
                  const m = masteries.find((item) => item.concept_id === concept.id);
                  const score = m ? m.mastery_score : 0;
                  return (
                    <div key={concept.id} className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="truncate font-semibold text-[#172033] dark:text-[#F4F5F7]">{concept.name}</span>
                        <span className="font-bold text-[#6C5CE7] dark:text-[#8175F5]">Level {Math.round(score / 10)}/10</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#F0EDFF] dark:bg-[#211D42] overflow-hidden border border-[#E3E6EF] dark:border-[#26324B]">
                        <div
                          className="h-full bg-gradient-to-r from-[#6C5CE7] to-[#8175F5] rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
