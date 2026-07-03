CREATE TYPE "hil_ops"."brain_dump_convert_type" AS ENUM('tactic', 'goal', 'project');--> statement-breakpoint
CREATE TYPE "hil_ops"."brain_dump_source" AS ENUM('manual', 'voice', 'slack', 'email');--> statement-breakpoint
CREATE TYPE "hil_ops"."brain_dump_status" AS ENUM('pending', 'triaged', 'converted', 'dismissed');--> statement-breakpoint
CREATE TYPE "hil_ops"."goal_category" AS ENUM('do', 'schedule', 'delegate', 'eliminate', 'general');--> statement-breakpoint
CREATE TYPE "hil_ops"."goal_status" AS ENUM('active', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "hil_ops"."goal_type" AS ENUM('long-term', 'medium-term');--> statement-breakpoint
CREATE TYPE "hil_ops"."llm_usage_source" AS ENUM('briefing', 'review', 'triage', 'other');--> statement-breakpoint
CREATE TYPE "hil_ops"."project_priority" AS ENUM('critical', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "hil_ops"."project_status" AS ENUM('active', 'paused', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "hil_ops"."tactic_event_type" AS ENUM('proposed', 'reviewed', 'gated', 'approved', 'rejected', 'requested_info', 'escalated', 'execution_started', 'completed', 'failed', 'reset');--> statement-breakpoint
CREATE TABLE "hil_ops"."agent_heartbeats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" text NOT NULL,
	"status" text NOT NULL,
	"task" text NOT NULL,
	"progress" integer,
	"log_line" text,
	"tone" text DEFAULT 'neutral' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hil_ops"."agent_skills" (
	"agent_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	CONSTRAINT "agent_skills_agent_id_skill_id_pk" PRIMARY KEY("agent_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "hil_ops"."brain_dump" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"source" "hil_ops"."brain_dump_source" DEFAULT 'manual' NOT NULL,
	"status" "hil_ops"."brain_dump_status" DEFAULT 'pending' NOT NULL,
	"converted_to_id" uuid,
	"converted_to_type" "hil_ops"."brain_dump_convert_type",
	"triage_summary" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hil_ops"."goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"type" "hil_ops"."goal_type" DEFAULT 'medium-term' NOT NULL,
	"category" "hil_ops"."goal_category" DEFAULT 'general' NOT NULL,
	"status" "hil_ops"."goal_status" DEFAULT 'active' NOT NULL,
	"timeframe" text,
	"parent_goal_id" uuid,
	"target_date" timestamp with time zone,
	"progress" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hil_ops"."llm_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"cache_read_tokens" integer DEFAULT 0 NOT NULL,
	"cache_creation_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" text,
	"source" "hil_ops"."llm_usage_source" DEFAULT 'other' NOT NULL,
	"tactic_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hil_ops"."projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" "hil_ops"."project_status" DEFAULT 'active' NOT NULL,
	"priority" "hil_ops"."project_priority" DEFAULT 'medium' NOT NULL,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hil_ops"."skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skills_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "hil_ops"."tactic_dependencies" (
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	CONSTRAINT "tactic_dependencies_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id")
);
--> statement-breakpoint
CREATE TABLE "hil_ops"."tactic_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tactic_id" uuid NOT NULL,
	"event_type" "hil_ops"."tactic_event_type" NOT NULL,
	"from_status" text,
	"to_status" text,
	"actor_type" "hil_ops"."author_type" NOT NULL,
	"actor_name" text NOT NULL,
	"detail" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hil_ops"."tactic_subtasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tactic_id" uuid NOT NULL,
	"title" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hil_ops"."agents" ADD COLUMN "instructions" text;--> statement-breakpoint
ALTER TABLE "hil_ops"."agents" ADD COLUMN "capabilities" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "hil_ops"."agents" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "hil_ops"."agents" ADD COLUMN "icon" text;--> statement-breakpoint
ALTER TABLE "hil_ops"."agents" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "hil_ops"."strategies" ADD COLUMN "goal_id" uuid;--> statement-breakpoint
ALTER TABLE "hil_ops"."tactics" ADD COLUMN "goal_id" uuid;--> statement-breakpoint
ALTER TABLE "hil_ops"."tactics" ADD COLUMN "estimated_minutes" integer;--> statement-breakpoint
ALTER TABLE "hil_ops"."tactics" ADD COLUMN "actual_minutes" integer;--> statement-breakpoint
ALTER TABLE "hil_ops"."tactics" ADD COLUMN "acceptance_criteria" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "hil_ops"."tactics" ADD COLUMN "collaborators" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "hil_ops"."tactics" ADD COLUMN "importance" text;--> statement-breakpoint
ALTER TABLE "hil_ops"."tactics" ADD COLUMN "urgency" text;--> statement-breakpoint
ALTER TABLE "hil_ops"."agent_skills" ADD CONSTRAINT "agent_skills_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "hil_ops"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hil_ops"."agent_skills" ADD CONSTRAINT "agent_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "hil_ops"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hil_ops"."llm_usage" ADD CONSTRAINT "llm_usage_tactic_id_tactics_id_fk" FOREIGN KEY ("tactic_id") REFERENCES "hil_ops"."tactics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hil_ops"."projects" ADD CONSTRAINT "projects_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "hil_ops"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hil_ops"."tactic_dependencies" ADD CONSTRAINT "tactic_dependencies_blocker_id_tactics_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "hil_ops"."tactics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hil_ops"."tactic_dependencies" ADD CONSTRAINT "tactic_dependencies_blocked_id_tactics_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "hil_ops"."tactics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hil_ops"."tactic_events" ADD CONSTRAINT "tactic_events_tactic_id_tactics_id_fk" FOREIGN KEY ("tactic_id") REFERENCES "hil_ops"."tactics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hil_ops"."tactic_subtasks" ADD CONSTRAINT "tactic_subtasks_tactic_id_tactics_id_fk" FOREIGN KEY ("tactic_id") REFERENCES "hil_ops"."tactics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_heartbeats_agent_created_idx" ON "hil_ops"."agent_heartbeats" USING btree ("agent_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_skills_skill_id_idx" ON "hil_ops"."agent_skills" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "brain_dump_status_idx" ON "hil_ops"."brain_dump" USING btree ("status");--> statement-breakpoint
CREATE INDEX "goals_parent_goal_id_idx" ON "hil_ops"."goals" USING btree ("parent_goal_id");--> statement-breakpoint
CREATE INDEX "goals_status_updated_at_idx" ON "hil_ops"."goals" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "llm_usage_created_at_idx" ON "hil_ops"."llm_usage" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "llm_usage_model_created_at_idx" ON "hil_ops"."llm_usage" USING btree ("model","created_at");--> statement-breakpoint
CREATE INDEX "projects_goal_id_idx" ON "hil_ops"."projects" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "hil_ops"."projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tactic_deps_blocked_id_idx" ON "hil_ops"."tactic_dependencies" USING btree ("blocked_id");--> statement-breakpoint
CREATE INDEX "tactic_events_tactic_id_idx" ON "hil_ops"."tactic_events" USING btree ("tactic_id");--> statement-breakpoint
CREATE INDEX "tactic_events_tactic_created_idx" ON "hil_ops"."tactic_events" USING btree ("tactic_id","created_at");--> statement-breakpoint
CREATE INDEX "tactic_subtasks_tactic_id_idx" ON "hil_ops"."tactic_subtasks" USING btree ("tactic_id");--> statement-breakpoint
ALTER TABLE "hil_ops"."strategies" ADD CONSTRAINT "strategies_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "hil_ops"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hil_ops"."tactics" ADD CONSTRAINT "tactics_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "hil_ops"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tactics_source_idx" ON "hil_ops"."tactics" USING btree ("source");