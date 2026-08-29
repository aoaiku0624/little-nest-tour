import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const gameRecords=sqliteTable("game_records",{
  id:text("id").primaryKey(),
  stateJson:text("state_json").notNull(),
  revision:integer("revision").notNull().default(1),
  agentStatus:text("agent_status").notNull().default("offline"),
  activeSessionId:text("active_session_id"),
  agentId:text("agent_id"),
  sessionOpenedAt:integer("session_opened_at"),
  processedRequestsJson:text("processed_requests_json").notNull().default("[]"),
  updatedAt:integer("updated_at").notNull(),
});
