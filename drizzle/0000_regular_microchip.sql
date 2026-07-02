CREATE SCHEMA "hil_ops";
--> statement-breakpoint
CREATE TYPE "hil_ops"."author_type" AS ENUM('human', 'agent');--> statement-breakpoint
CREATE TYPE "hil_ops"."ci_state" AS ENUM('passing', 'failing', 'pending', 'none');--> statement-breakpoint
CREATE TYPE "hil_ops"."decision" AS ENUM('approve', 'reject', 'request_more_info');--> statement-breakpoint
CREATE TYPE "hil_ops"."risk_level" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "hil_ops"."strategy_status" AS ENUM('draft', 'active', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "hil_ops"."tactic_source" AS ENUM('inbox', 'pr', 'simulated');--> statement-breakpoint
CREATE TYPE "hil_ops"."tactic_status" AS ENUM('proposed', 'needs_review', 'approved', 'rejected', 'running', 'completed');--> statement-breakpoint
CREATE TABLE "hil_ops"."agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"model" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hil_ops"."approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tactic_id" uuid NOT NULL,
	"decision" "hil_ops"."decision" NOT NULL,
	"notes" text,
	"decided_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hil_ops"."messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_type" text NOT NULL,
	"parent_id" uuid NOT NULL,
	"author_type" "hil_ops"."author_type" NOT NULL,
	"author_id" uuid NOT NULL,
	"author_name" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hil_ops"."strategies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"goal" text NOT NULL,
	"rules" text NOT NULL,
	"human_gate_triggers" text DEFAULT '' NOT NULL,
	"status" "hil_ops"."strategy_status" DEFAULT 'draft' NOT NULL,
	"owner_id" uuid,
	"mission_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hil_ops"."tactics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"strategy_id" uuid NOT NULL,
	"agent_id" uuid,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"steps" text[] DEFAULT '{}' NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence" integer DEFAULT 0 NOT NULL,
	"risk_level" "hil_ops"."risk_level" DEFAULT 'low' NOT NULL,
	"status" "hil_ops"."tactic_status" DEFAULT 'proposed' NOT NULL,
	"requires_human_approval" boolean DEFAULT false NOT NULL,
	"human_decision" "hil_ops"."decision",
	"uncertainty_notes" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"source" "hil_ops"."tactic_source" DEFAULT 'simulated' NOT NULL,
	"source_id" text,
	"ci_checks" jsonb,
	"pr_mergeable" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hil_ops"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'operator' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "hil_ops"."approvals" ADD CONSTRAINT "approvals_tactic_id_tactics_id_fk" FOREIGN KEY ("tactic_id") REFERENCES "hil_ops"."tactics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hil_ops"."approvals" ADD CONSTRAINT "approvals_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "hil_ops"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hil_ops"."strategies" ADD CONSTRAINT "strategies_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "hil_ops"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hil_ops"."tactics" ADD CONSTRAINT "tactics_strategy_id_strategies_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "hil_ops"."strategies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hil_ops"."tactics" ADD CONSTRAINT "tactics_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "hil_ops"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tactics_source_source_id_unique" ON "hil_ops"."tactics" USING btree ("source","source_id");--> statement-breakpoint
CREATE INDEX "tactics_status_human_approval_idx" ON "hil_ops"."tactics" USING btree ("status","requires_human_approval");--> statement-breakpoint
CREATE INDEX "tactics_status_updated_at_idx" ON "hil_ops"."tactics" USING btree ("status","updated_at");