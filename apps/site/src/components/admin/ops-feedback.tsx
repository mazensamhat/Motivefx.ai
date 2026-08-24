"use client";

import { MessageSquare } from "lucide-react";
import { FeedbackInboxPanel } from "@/components/admin/feedback-inbox-panel";

export function OpsFeedback() {
  return (
    <section className="ops-page">
      <header className="ops-page-header">
        <div className="ops-page-icon">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div>
          <h2>Feedback</h2>
          <p>User-submitted bugs, features, and billing notes</p>
        </div>
      </header>
      <FeedbackInboxPanel />
    </section>
  );
}
