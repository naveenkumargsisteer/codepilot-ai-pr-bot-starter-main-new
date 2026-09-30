export const updateJiraTicketStatus = async (id: string, status: 'processing' | 'processed' | 'dismissed' | 'pending', currentStatus: string) => {
  try {
    const res = await fetch(`/api/jira/notifications/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, currentStatus })
    });
    return res.ok;
  } catch (err) {
    console.error(`Failed to update Jira ticket ${id}`, err);
    return false;
  }
};

export const generateJiraPrompt = (ticket: any) => {
  return `Please implement Jira issue ${ticket.issue_key}: ${ticket.summary}\n\nDescription:\n${ticket.description}\n\nURL: ${ticket.url}`;
};
