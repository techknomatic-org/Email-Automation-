# Graph Report - OpenOutreach-main  (2026-09-01)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3027 nodes · 6716 edges · 223 communities (130 shown, 56 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 488 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Lead
- QueryNode
- logging.py
- database.py
- Mailbox
- test_warmth.py
- pipeline.py
- ._box
- _in_rome
- classify
- FakeIMAP
- test_unsubscribe.py
- api/leads.py
- parsing.py
- _box
- _campaign
- test_discovery.py
- onboarding.py
- test_onboarding.py
- app/models/__init__.py
- ndarray
- discover
- outreach.py
- check_lookup
- Keyword
- CampaignCopilotAgent
- LeadFactory
- BayesianQualifier
- test_version.py
- sender.py
- reconcile_history
- api.js
- unanswered_replies
- test_classify.py
- package.json
- SiteConfig
- test_project.py
- App.jsx
- cycle.py
- llm.py
- patch
- ensure_anchors
- Deals.jsx
- reply.py
- service.py
- DealFactory
- conftest.py
- Lead
- CampaignWizard.jsx
- Leads.jsx
- test_summaries.py
- sync.py
- rundaemon.py
- qualifier.py
- summaries.py
- test_qualifier.py
- bettercontact.py
- test_bettercontact.py
- test_mail_pass.py
- api/knowledge.py
- version.py
- run_qualification
- reconcile_facts
- top_up.py
- PollOutcome
- TestAnchors
- DataNormalizer
- HybridSearchEngine
- WebSearchLeadProvider
- OutreachDecision
- embed_text
- Campaign
- update_chat_summary
- test_geo.py
- send_first_email
- TestAliasOptOut
- schemas/deal.py
- QueryNodeAdmin
- ai_copilot.py
- Settings
- ManualProfileModal.jsx
- _replied_deal
- ._anchored
- CampaignRunner
- ApolloLeadProvider
- KnowledgeBase.jsx
- Command
- project.py
- threads.py
- LeadProvider
- ExcelLeadProvider
- verify_auth
- _sent_message
- attachments.py
- RAGService
- _AgentRunner
- extract_db_path
- run_daemon
- fetch_kit
- Any
- Dashboard.jsx
- TestSentBodyLogging
- get_lead_provider
- LeadVerificationService
- 0003_chatmessage_deal_fk.py
- ._retire_anchors
- test_mail_log_backfill.py
- MockLeadProvider
- outbound
- TestColdPhaseAcquisition
- _rank_by_score
- Qualifier
- 0003_siteconfig.py
- 0011_collapse_prescreen_empties.py
- version_string
- 0003_public_identifier_unique.py
- 0017_migrate_no_email_failures.py
- 0003_alter_mailbox_daily_limit.py
- test_mailbox.py
- OpenRouterService
- 0002_add_sync_fields.py
- 0002_rename_engine_tables.py
- 0008_clause_lattice.py
- tokenize
- 0002_rename_description_to_profile_data.py
- 0005_lead_urn.py
- 0009_outcome.py
- 0010_deal_next_check_pending_at.py
- 0014_pivot_lead_reshape.py
- 0018_lead_source_fields_alter_lead_discovered_by.py
- 0004_compress_campaign_model_blob.py
- 0007_siteconfig_llm_provider.py
- .model_post_init
- ChatConfig
- SiteConfigAdmin
- CoreConfig
- 0004_pivot_email_config.py
- 0007_seed_frontier_drop_legacy_cursor.py
- _AnchorProfiles
- CrmConfig
- EmailsConfig
- 0008_backfill_mail_log.py
- LegacyConfig
- 0002_profile_self_lead.py
- 0009_drop_legacy_pending_tasks.py
- _isolated
- chat/migrations/0001_initial.py
- 0004_pivot_external_id.py
- 0005_alter_chatmessage_external_id.py
- 0006_remove_chatmessage_uniq_deal_external_id_and_more.py
- core/migrations/0001_initial.py
- 0003_siteconfig_finder_api_key.py
- 0005_rename_campaign_objective_campaign_campaign_target.py
- 0006_campaign_country_code_discoveryquery.py
- 0009_remove_clause_is_live.py
- 0010_campaign_discovery_minted_at_qualified.py
- 0012_campaign_anchor_embeddings_campaign_anchor_profiles.py
- 0013_keyword_querynode_remove_clause_uniq_clause_and_more.py
- 0014_delete_discoveryquery.py
- 0015_delete_task_drop_action_fraction.py
- crm/migrations/0001_initial.py
- 0004_alter_deal_state.py
- 0006_deal_summaries.py
- 0007_drop_legacy_lead_fields.py
- 0008_vacuum.py
- 0011_repoint_campaign_fk_to_core.py
- 0012_lead_api_email_lead_contact_info.py
- 0013_alter_deal_state.py
- 0015_lead_discovered_by.py
- 0016_alter_deal_state.py
- 0019_alter_deal_state.py
- 0020_deal_not_before_and_lookup_handle.py
- 0021_remove_deal_email_message_id_deal_thread.py
- emails/migrations/0001_initial.py
- 0002_mailbox_signature.py
- 0004_alter_mailbox_daily_limit_sendverdict.py
- 0005_mailbox_unsub_scan_uid_and_more.py
- 0006_mailbox_next_send_at.py
- 0007_deliveryevent_foldercoverage_message_thread_and_more.py
- steps/__init__.py
- legacy/migrations/0001_initial.py
- 0005_remove_task_error.py
- 0006_update_default_limits.py
- 0008_drop_connect_weekly_limit.py
- 0010_move_engine_models_to_core.py
- 0011_pivot_drop_channel_models.py

## God Nodes (most connected - your core abstractions)
1. `BayesianQualifier` - 88 edges
2. `LeadFactory` - 71 edges
3. `FakeIMAP` - 57 edges
4. `Lead` - 56 edges
5. `message()` - 53 edges
6. `SiteConfig` - 49 edges
7. `Deal` - 49 edges
8. `Campaign` - 40 edges
9. `DealFactory` - 37 edges
10. `QueryNode` - 36 edges

## Surprising Connections (you probably didn't know these)
- `_node()` --uses--> `QueryNode`  [INFERRED]
  tests/test_discovery_wiring.py → openoutreach/core/models.py
- `TestEmptyPages` --uses--> `QueryNode`  [INFERRED]
  tests/test_discovery_wiring.py → openoutreach/core/models.py
- `TestHarvest` --uses--> `QueryNode`  [INFERRED]
  tests/test_discovery_wiring.py → openoutreach/core/models.py
- `TestOutage` --uses--> `QueryNode`  [INFERRED]
  tests/test_discovery_wiring.py → openoutreach/core/models.py
- `_populate()` --uses--> `QueryNode`  [INFERRED]
  tests/test_reset_pipeline.py → openoutreach/core/models.py

## Import Cycles
- None detected.

## Communities (223 total, 56 thin omitted)

### Community 0 - "Lead"
Cohesion: 0.05
Nodes (84): accept_all_campaign_leads(), accept_campaign_lead(), accept_campaign_leads_batch(), _calculate_total_seconds(), control_campaign(), create_campaign(), delete_campaign(), generate_lead_pool_endpoint() (+76 more)

### Community 1 - "QueryNode"
Cohesion: 0.04
Nodes (62): create_lead(), Persist one Lead Finder row as an embedded Lead awaiting qualification. Keyed…, QueryNode, One node in a campaign's discovery walk — a keyword set, and where it has been…, This node's keywords as sorted ``(field, token)`` pairs., This node as a Lead Finder filter dict — the only thing the provider sees., The query itself, not its row id — a node *is* its keyword set., State (+54 more)

### Community 2 - "logging.py"
Cohesion: 0.06
Nodes (47): _create_deal(), create_disqualified_deal(), _deals_at_state(), _existing_deal_or_lead(), get_qualified_profiles(), get_ready_to_find_email_profiles(), atomic, DealState (+39 more)

### Community 3 - "database.py"
Cohesion: 0.05
Nodes (59): delete_csv_file(), ensure_csv_dir(), get_dataset_validation_stats(), import_existing_csv_file(), list_csv_files(), parse_csv_metadata(), preview_csv_file(), Any (+51 more)

### Community 4 - "Mailbox"
Cohesion: 0.06
Nodes (56): google_callback(), google_login(), get, Session, Generate Google OAuth 2.0 consent URL for Gmail authentication., Handle Google OAuth callback — exchange code for tokens and connect Mailbox., create_mailbox(), delete_mailbox() (+48 more)

### Community 5 - "test_warmth.py"
Cohesion: 0.06
Nodes (45): date, Re-measure every mailbox's warm capacity, once a day. Costs an IMAP round trip…, refresh_capacities_if_due(), capacity_from(), _count_by_day(), _header_date(), _is_bouncing(), _logout() (+37 more)

### Community 6 - "pipeline.py"
Cohesion: 0.10
Nodes (54): ai_assist_composer(), AiAssistComposerRequest, execute_deal_action(), ExecuteActionPayload, format_iso_utc(), get_ab_metrics(), get_campaign_execution(), get_deal_events() (+46 more)

### Community 7 - "._box"
Cohesion: 0.07
Nodes (25): get_emailable_deals(), The email pool — Deals queued for their single Layer-1 email, oldest first.…, django_db, The 3-minute floor between two cold emails, per box., Out of hours nothing opens a conversation, however much headroom is left., A never-asked box (NULL) sends unsigned rather than crashing on None., Threaded replies go through the same assembly, so they carry it too., A deal queued for its Layer-1 email (READY_TO_EMAIL, address resolved). (+17 more)

### Community 8 - "_in_rome"
Cohesion: 0.07
Nodes (29): business_days_between(), _business_days_in_range(), is_business_day(), datetime, True for Monday–Friday., Whole working days elapsed from ``start`` to ``end`` (weekends excluded).…, Number of Monday–Friday days in the half-open range ``[start, end)``., operator_timezone() (+21 more)

### Community 9 - "classify"
Cohesion: 0.07
Nodes (33): classify(), _detail(), _enhanced_status(), _from_code(), Policy, policy_for(), Exception, _queue_id() (+25 more)

### Community 10 - "FakeIMAP"
Cohesion: 0.10
Nodes (23): FakeIMAP, message(), One inbox message, as ``(uid, raw bytes)``., An ``IMAPClient`` stand-in holding one folder., _box(), _coverage(), _mirror(), django_db (+15 more)

### Community 11 - "test_unsubscribe.py"
Cohesion: 0.07
Nodes (33): DeliveryEventInline, What the world said about this send, in the order it said it., _local_midnight(), Mailbox, MailboxManager, Meta, One SMTP inbox, connected field-by-field at onboarding. A row exists only once…, Start of today where the operator is — the horizon every per-day ledger counts… (+25 more)

### Community 12 - "api/leads.py"
Cohesion: 0.07
Nodes (46): check_lead_duplicate_api(), create_lead(), delete_lead(), execute_duplicate_action_api(), get_lead(), list_leads(), delete, get (+38 more)

### Community 13 - "parsing.py"
Cohesion: 0.07
Nodes (47): _is_auto_reply(), is_bounce(), _is_opt_out(), _joins_a_thread_we_started(), _kind_of(), Message, The rules, in the order they must be asked., True when this is a non-delivery report rather than something someone wrote.… (+39 more)

### Community 14 - "_box"
Cohesion: 0.09
Nodes (22): _box(), _called(), _deal(), django_db, fixture, Mailbox, **The 2026-08-05 incident.** Two lookups had backed off 45 hours; they were the…, Never buy an address, or spend an LLM call, for someone there is no room to… (+14 more)

### Community 15 - "_campaign"
Cohesion: 0.14
Nodes (14): The campaign's labelled leads, **plus the anchors as positives**. Qualified =…, _campaign(), _labelled(), _node(), parametrize, The cold phase's only positives — see ``LabelStore.load``., A lead with a verdict — the only evidence the walk reads., TestAnchorsAsPositives (+6 more)

### Community 16 - "test_discovery.py"
Cohesion: 0.07
Nodes (18): ICPSpec, The ICP as ``(field, token)`` keywords — the vocabulary the walk opens with.…, The LLM's provider-agnostic ICP output — the walk's opening **vocabulary**. Not…, _seed_keywords(), The log rendering of a Lead Finder filter set. Pure (no colour) so the call…, min/max are two keys describing one thing; they read as one., Every family we search is ``lead_*`` (the only ``company_*`` keys are the two…, An all-unset proposal means 'the LLM is dry' — it must not read as a query. (+10 more)

### Community 17 - "onboarding.py"
Cohesion: 0.07
Nodes (34): hyperlink(), Render `text` (default: the URL) as an OSC 8 clickable terminal link. On a non-…, _account_done(), _campaign_done(), _information_notice_markdown(), _legal_notice_sections(), _looks_like_country(), _looks_like_email() (+26 more)

### Community 18 - "test_onboarding.py"
Cohesion: 0.10
Nodes (35): missing_keys(), Ask every never-asked box for its sign-off, persisting each as it lands. Keyed…, Collect jurisdiction, show the funding-behaviour notice, gate on the Legal…, Gate onboarding on Legal Notice acceptance; re-ask a decline, abort on cancel., Return the keys of steps that still need attention (empty ⇒ fully onboarded)., _require_legal(), _run_account(), _run_mailbox() (+27 more)

### Community 19 - "app/models/__init__.py"
Cohesion: 0.15
Nodes (27): add_step(), create_sequence(), get_campaign_sequences(), BaseModel, get, post, Session, SequenceCreate (+19 more)

### Community 20 - "ndarray"
Cohesion: 0.09
Nodes (20): _gpr_predict(), KitQualifier, _prob_above_half(), ndarray, Transform through all steps except GPR, then predict with return_std. Used by…, Real observations plus any anchors, as ``(X, y)`` — what the GP fits on., Fit StandardScaler + GPR pipeline if dirty and feasible. Returns True when…, Subsample the majority class to at most _MAX_IMBALANCE_RATIO * minority.… (+12 more)

### Community 21 - "discover"
Cohesion: 0.16
Nodes (14): NamedTuple, discover(), Fire frontier nodes until one returns leads. Returns the count of new Leads.…, Page, One Lead Finder response: the rows, and the corpus count behind them.…, _campaign(), _labelled(), _node() (+6 more)

### Community 22 - "outreach.py"
Cohesion: 0.10
Nodes (27): _business_days_since_last_outgoing(), _format_recent_messages(), _humanize_age(), _load_recent_messages(), _log_chat_facts(), datetime, Render the outreach prompt for whichever end of the thread we're at., The thread's last `limit` **turns**, in chronological order. The recency window… (+19 more)

### Community 23 - "check_lookup"
Cohesion: 0.12
Nodes (23): block_header(), The bold ``▶`` header naming one task block; optional ``· meta`` suffix.…, One indented step under a block header: glyph · label · message. ``color``…, step_line(), _back_off(), buy_address(), check_lookup(), _delay_for() (+15 more)

### Community 24 - "Keyword"
Cohesion: 0.11
Nodes (21): Keyword, Meta, One ``(field, token)`` pair — the unit a discovery query is built from. A…, Get-or-create the rows for ``(field, token)`` pairs, in order. Idempotent., sha256 of the canonicalized keyword set — the node-identity key. Order-…, token_key(), admitted_keywords(), _qualified_source_fields() (+13 more)

### Community 25 - "CampaignCopilotAgent"
Cohesion: 0.09
Nodes (21): CampaignCopilotAgent, CampaignPlan, EmailDraft, _extract_first_name(), LeadResearchResult, NextBestActionEngine, NextBestActionOutput, OutreachAgent (+13 more)

### Community 26 - "LeadFactory"
Cohesion: 0.18
Nodes (11): _config(), django_db, An operator inside the EEA/UK/CH does not give back (jurisdiction gate)., The client names its build; the hub decides what that name means., Including resolve, which never reaches a stored row., _resp(), TestBuildReporting, TestContribute (+3 more)

### Community 27 - "BayesianQualifier"
Cohesion: 0.08
Nodes (13): BayesianQualifier, Gaussian Process Regressor for active learning qualification. Uses an sklearn…, Return (n_negatives, n_positives) — anchors counted as positives. The anchors…, How many invented positives are still standing., How many real leads have qualified — the anchors' retirement clock., Whether a real lead has ever qualified. Not the phase test (that is…, Whether any invented positive is still standing — the engine's phase test.…, The fitted sklearn Pipeline — serializable via joblib. (+5 more)

### Community 28 - "test_version.py"
Cohesion: 0.13
Nodes (29): calver(), commit_sha(), is_dirty(), The full 40-char commit sha of this checkout, or ``"unknown"``., ``YYYY.MM.DD`` of the commit's authored date, or ``"unknown"``., Whether the working copy has uncommitted changes (``None`` = undetermined)., _checkout(), _git_says() (+21 more)

### Community 29 - "sender.py"
Cohesion: 0.10
Nodes (26): _attribute(), _build_message(), _deliver(), _headers_of(), _list_unsubscribe(), _mint_message_id(), _opt_out(), EmailMessage (+18 more)

### Community 30 - "reconcile_history"
Cohesion: 0.13
Nodes (19): MigrateCommand, Command, `migrate`, with a pre-flight reconciliation of renames recorded in history. Two…, drop_deleted_migrations(), Pre-``migrate`` reconciliation of renames recorded in django_migrations. When…, Rewrite renamed app labels in django_migrations. Returns notes for logging., Rewrite renamed migration filenames in django_migrations. Must run *after*…, Remove django_migrations rows whose migration file no longer exists. (+11 more)

### Community 31 - "api.js"
Cohesion: 0.14
Nodes (18): formatLocalTime(), LiveCampaign(), STATE_CONFIGS, api, API_BASE_URL, controlCampaign(), executeAction(), getCampaignExecution() (+10 more)

### Community 32 - "unanswered_replies"
Cohesion: 0.20
Nodes (14): EMAILED deals whose newest inbound turn is newer than our newest outgoing one.…, unanswered_replies(), _box(), _emailed(), _our_answer(), django_db, Mailbox, The two timestamps must stay subqueries, never aggregates. An aggregate groups… (+6 more)

### Community 33 - "test_classify.py"
Cohesion: 0.16
Nodes (16): classify(), classify_pending(), Classify every message no current-version verdict covers. Returns rows read.…, Re-read one stored message and persist the verdict. Returns its ``kind``. A…, auto_reply(), A vacation responder: threads like a reply, and nobody wrote it., _box(), _kind_of() (+8 more)

### Community 34 - "package.json"
Cohesion: 0.07
Nodes (26): axios, dependencies, axios, lucide-react, react, react-dom, devDependencies, @types/react (+18 more)

### Community 35 - "SiteConfig"
Cohesion: 0.10
Nodes (23): A stored email for *lead*, or ``None`` — a miss, no token yet, or an outage all…, resolve(), Load `SiteConfig` and assert the required LLM fields are populated., _validated_site_config(), Singleton model for global site configuration (LLM keys, etc.)., SiteConfig, _bettercontact_done(), _create_operator() (+15 more)

### Community 36 - "test_project.py"
Cohesion: 0.15
Nodes (16): project_pending(), Act on every classified message nothing has acted on yet. Returns rows handled., bounce_rate(), Bounces per accepted send over the trailing window; 0.0 with nothing sent.…, bounce(), A non-delivery report from the receiving side's daemon., _box(), _pass() (+8 more)

### Community 37 - "App.jsx"
Cohesion: 0.12
Nodes (13): App(), ErrorBoundary, MENU_ITEMS, Sidebar(), Analytics(), FUNNEL_STAGES, Mailboxes(), Settings() (+5 more)

### Community 38 - "cycle.py"
Cohesion: 0.13
Nodes (24): _answer_replies(), _apply(), _buy_addresses(), _check_lookups(), _due(), _log_idle(), _pipeline_summary(), _pool_signature() (+16 more)

### Community 39 - "llm.py"
Cohesion: 0.10
Nodes (16): build_llm_model(), _ping_model(), LLM model factory + sync boundary for pydantic-ai. Two public entry points: -…, Split a `provider:model` identifier into ``(provider, model)``. A bare model…, Build a pydantic-ai `Model` from explicit credentials. Shared by…, Send one trivial request to prove the credentials work (or raise)., Live ping for onboarding: return ``None`` if the model answers, else the error., split_model_id() (+8 more)

### Community 40 - "patch"
Cohesion: 0.18
Nodes (21): _error(), integer(), multiline(), Ask for a line of text. Returns the stripped value, or ``None`` on cancel.…, Ask for a whole number, re-asking until valid. Returns ``int`` or ``None``., Multi-line text (Enter inserts a newline, Ctrl+D submits). Returns the stripped…, text(), patch (+13 more)

### Community 41 - "ensure_anchors"
Cohesion: 0.20
Nodes (13): ensure_anchors(), The campaign's anchor embeddings as ``(N, dim)``, filled up to…, _campaign(), _llm_returns(), A second round must widen the ideal region, not restate it., Stub the whole LLM boundary — model resolution, Agent, and the run., Best-effort: an unanchored campaign still runs, just without a fitted GP., Re-inventing them each boot would re-anchor the GP somewhere slightly else. (+5 more)

### Community 42 - "Deals.jsx"
Cohesion: 0.14
Nodes (18): Campaigns(), Deals(), FILE_TYPE_CONFIG, GmailStyleComposer(), PIPELINE_STAGES, STATE_CONFIG, aiAssistComposer(), deleteCampaign() (+10 more)

### Community 43 - "reply.py"
Cohesion: 0.14
Nodes (22): get_active_user(), Who is running this daemon. Self-hosted means one operator, so identity is a…, The Django ``User`` running the daemon (the onboarded operator)., The operator's own identity, synthesized (not scraped). Name comes from the…, The seller's first name as the LLM knows it, with a username fallback., The seller's full name for the prompt's identity binding., self_profile(), seller_full_name() (+14 more)

### Community 44 - "service.py"
Cohesion: 0.13
Nodes (21): _attach_embedding(), _auth(), _build_fields(), contribute(), _endpoint(), _headers(), Add the cached profile vector to *record*, in place, when it's in hand. The…, Mint + persist the operator token via the folded first contribution. Keyed to… (+13 more)

### Community 45 - "DealFactory"
Cohesion: 0.13
Nodes (14): _closed_states(), Honour an opt-out from *address*: suppress every lead at it, close their deals.…, States an unsubscribe leaves alone — the deal is already over. Overwriting one…, suppress_email(), TestLoadRecentMessages, deal_with_lead(), fixture, ``Lead.email`` has no unique constraint — one address, many rows. (+6 more)

### Community 46 - "conftest.py"
Cohesion: 0.12
Nodes (19): Command, BaseCommand, setup_crm(), campaign(), _ensure_crm_data(), _mock_embeddings(), _open_sending_window(), operator() (+11 more)

### Community 47 - "Lead"
Cohesion: 0.11
Nodes (11): Lead, Meta, ndarray, Standard profile dict shape used by qualifiers and pools. The rich profile is…, 384-dim float32 numpy array from stored bytes, or None., Labeled embeddings for a campaign as (X, y) numpy arrays for warm start. The…, setter, A NO_EMAIL_BETTERCONTACT miss is a fit positive (label=1), not skipped — the… (+3 more)

### Community 48 - "CampaignWizard.jsx"
Cohesion: 0.22
Nodes (15): ConfirmModal(), CsvUploadModal(), ImportDatasetModal(), ImportSummaryModal(), CampaignWizard(), MasterDatabase(), createCampaign(), deleteCsvFile() (+7 more)

### Community 49 - "Leads.jsx"
Cohesion: 0.16
Nodes (17): DatasetValidationPanel(), Lead360Modal(), FitBar(), fitColor(), Leads(), _LEADS_CACHE, acceptAllLeads(), acceptBatchLeads() (+9 more)

### Community 50 - "test_summaries.py"
Cohesion: 0.13
Nodes (15): FunctionModel, _build_identity_binding(), extract_facts(), materialize_profile_summary_if_missing(), Build `deal.profile_summary` lazily on first follow-up touch. Extracts facts…, Return a prompt fragment binding [Me] to the seller's name. Closes the bug…, Extract a flat list of atomic facts from `text`. `seller_name` binds the [Me]…, TestModel (+7 more)

### Community 51 - "sync.py"
Cohesion: 0.14
Nodes (19): IMAPClient, One full pass over every mailbox. Returns ``(mirrored, classified, projected)``., run_mail_pass(), _connect(), _fetch(), _folder_state(), mirror(), _new_uids() (+11 more)

### Community 52 - "rundaemon.py"
Cohesion: 0.13
Nodes (13): LogRecord, ColoredFormatter, configure_logging(), print_banner(), Configure root logger with colored output and silence noisy libraries., Print the OpenOutreach startup banner in bold cyan., Compact colored formatter: ``[LVL] message``., Command (+5 more)

### Community 53 - "qualifier.py"
Cohesion: 0.13
Nodes (18): get_llm_model(), Return a configured pydantic-ai `Model` for the current `SiteConfig`., Drive *coro* on the dedicated LLM runner thread + loop., run_agent_sync(), _explain_score(), format_prediction(), BaseModel, QualificationDecision (+10 more)

### Community 54 - "summaries.py"
Cohesion: 0.15
Nodes (18): _apply_memory_actions(), FactList, _MemoryAction, _parse_memory_response(), BaseModel, mem0-style fact-list summaries for Deal profile and chat history. Single LLM…, Run mem0's UPDATE prompt and return the parsed event list. Calls the LLM in raw…, Parse mem0's UPDATE prompt response, mirroring upstream's two-step fallback. (+10 more)

### Community 55 - "test_qualifier.py"
Cohesion: 0.12
Nodes (8): _binary_entropy(), H(p) = -p log p - (1-p) log(1-p), safe for edge values., _make_trained_qualifier(), Predictive entropy cannot exceed ln(2) ~ 0.693., Create a qualifier with both classes so the GPC can fit., TestBaldScores, TestBayesianQualifierPredict, TestExplainProfile

### Community 56 - "bettercontact.py"
Cohesion: 0.19
Nodes (20): BetterContactQuery, BetterContactResult, BetterContactUnavailable, _enrich_body(), _poll(), poll_once(), Exception, Poll one in-flight lookup exactly once — no wait, no retry loop. ``running``… (+12 more)

### Community 57 - "test_bettercontact.py"
Cohesion: 0.19
Nodes (8): _fake_session(), _patch_session(), A requests.Session stand-in usable as a context manager., _response(), _terminal(), TestIsConfigured, TestPollOnce, TestSubmit

### Community 58 - "test_mail_pass.py"
Cohesion: 0.18
Nodes (12): _emailed(), _pass(), django_db, It arrives, it threads, and the agent is never handed it., An outage delays reading the mail, not interpreting it., A deal whose opener has gone out — the state a reply arrives into. Sent the day…, A client that fills only ``In-Reply-To`` points at the newest message, not the…, The operator's own mail stays theirs: it is not our conversation. (+4 more)

### Community 59 - "api/knowledge.py"
Cohesion: 0.19
Nodes (16): create_document(), delete_document(), DocumentCreate, list_documents(), BaseModel, delete, get, post (+8 more)

### Community 60 - "version.py"
Cohesion: 0.18
Nodes (18): _build(), _commit_date(), _git(), _git_dir(), _packed_ref(), Path, What build of OpenOutreach is this instance running. There are no releases —…, HEAD's sha by reading ``.git`` directly — no ``git`` binary required. Handles… (+10 more)

### Community 61 - "run_qualification"
Cohesion: 0.21
Nodes (10): Qualify one unlabelled profile via the LLM. Returns profile_url or None.…, run_qualification(), _axis(), _make_lead(), django_db, ndarray, The degraded path: anchoring failed, so the label set is still single-class and…, A 384-dim vector on a single axis — orthogonal, so distances are exact. (+2 more)

### Community 62 - "reconcile_facts"
Cohesion: 0.20
Nodes (10): Reconcile `new_facts` against `existing` via mem0's UPDATE prompt. The seller…, reconcile_facts(), FunctionModel that returns a fixed text response on every call., reconcile_facts wraps mem0's UPDATE prompt — mock the LLM at the boundary., LLM returns DELETE for the stale fact + ADD for the new one — both applied., LLM hallucinates an id that doesn't exist — log + skip, don't crash., Provider that wraps JSON in ```json ... ``` should still parse via fallback., Reasoning model output with <think> blocks before the JSON parses cleanly. (+2 more)

### Community 63 - "top_up.py"
Cohesion: 0.16
Nodes (16): qualifier_for(), Build this campaign's qualifier, ready to score. May return None. Built where…, find_freemium_candidate(), _pick_best(), Return the top-ranked embedded lead eligible for the paid email lookup.…, Rank leads by qualifier and return the top-1 profile dict., fetch_qualification_candidates(), Embedded, un-dealt Leads awaiting qualification in this campaign, oldest first.… (+8 more)

### Community 64 - "PollOutcome"
Cohesion: 0.21
Nodes (8): PollOutcome, Result of a single poll of an in-flight lookup. ``running`` — the job hasn't…, _in_flight(), Reachability failed, not fit — the ML labeler keeps the lead positive., The rail exists so ``datetime`` can still express the schedule., Nothing was learned about the job, so the backoff must not advance., Abandoning reverted the deal and bought a *second* job for the same lead., TestCheckLookup

### Community 65 - "TestAnchors"
Cohesion: 0.18
Nodes (7): Synthetic positives that let a GP fit before any real lead has qualified. The…, The handover is gradual. Dropping every anchor at the first acceptance took the…, Only a positive ends the cold phase — rejections are what it is made of., Safe to call on every daemon boot — a campaign whose real positives have…, ``_balance`` caps the majority at 2x the minority. With 3 synthetic positives…, Boot order is warm_start then anchor, but neither may clobber the other., TestAnchors

### Community 66 - "DataNormalizer"
Cohesion: 0.17
Nodes (10): CsvExcelImporter, Any, Session, Production-Grade CSV / Excel Import & PostgreSQL Ingestion Engine. Handles file…, Import CSV or Excel file into PostgreSQL Lead database., DataNormalizer, Any, AI Natural-Language Prompt Interpreter. Parses informal, abbreviated, or non-… (+2 more)

### Community 67 - "HybridSearchEngine"
Cohesion: 0.21
Nodes (10): HybridSearchEngine, Any, Lead, Session, 3-Stage PostgreSQL + pgvector Hybrid Lead Search & Discovery Engine. Stage A:…, Executes Fact and Dimension based Hybrid Lead Matching: Flow: Campaign Input ->…, Uses OpenRouter multi-model fallback chain to evaluate candidate lead rows…, Auto-seed PostgreSQL database from input CSV/Excel files if database is… (+2 more)

### Community 68 - "WebSearchLeadProvider"
Cohesion: 0.22
Nodes (7): Any, Real AI-Driven Web Search Lead Discovery Provider. Integrates Live Public…, Execute web search query via Tavily / SerpAPI / HTTP retrieval., Execute real Web Search for public candidate profiles matching AI Search…, Check Web Search provider availability., OpenRouter / OpenAI LLM Real B2B Candidate Retrieval Grounding Engine.…, WebSearchLeadProvider

### Community 69 - "OutreachDecision"
Cohesion: 0.21
Nodes (10): model_validator, OutreachDecision, BaseModel, A first touch must be a sendable email with its own subject., Structured output from the outreach agent, at either end of the thread., _validate_opener(), deal_with_summaries(), fixture (+2 more)

### Community 70 - "embed_text"
Cohesion: 0.17
Nodes (12): no_embed_mock, embed_text(), embed_texts(), _get_model(), ndarray, Lazy-load fastembed model singleton., Embed a single text string → 384-dim numpy array., Embed multiple texts → (N, 384) numpy array. (+4 more)

### Community 71 - "Campaign"
Cohesion: 0.16
Nodes (11): create_freemium_deal(), Create a QUALIFIED Deal in the freemium campaign for a candidate lead., Command, BaseCommand, Campaign, import_freemium_campaign(), profile_url_from_slug(), Build the provider profile URL for a kit seed's public-id slug. (+3 more)

### Community 72 - "update_chat_summary"
Cohesion: 0.21
Nodes (9): _format_messages_for_extraction(), Render conversation turns as a labeled transcript for fact extraction. Both…, Fold newly-read inbound turns into `deal.chat_summary` incrementally. Existing…, update_chat_summary(), A mail-log turn, as the reply step hands them over., Both sides are sent to extraction with [Me]/[Lead] tags for disambiguation., A one-sided seller-only burst must not pollute chat_summary with our pitch., A second sync routes through reconcile_facts → mem0 UPDATE prompt. (+1 more)

### Community 73 - "test_geo.py"
Cohesion: 0.22
Nodes (11): is_eea_located(), is_gdpr_protected(), Check whether *country_code* falls under opt-in email marketing laws. Missing /…, Check whether *country_code* is in the EEA/UK/CH data-collection regime. Gates…, parametrize, test_case_insensitivity(), test_country_code_lookup(), test_eea_located_case_insensitivity() (+3 more)

### Community 74 - "send_first_email"
Cohesion: 0.15
Nodes (11): operator_bcc(), The address to blind-copy on this campaign's sends, or None for no copy. The…, True when *lead* may not be emailed — re-read from the DB at send time. The…, suppressed(), DealState, Open the conversation with *deal* from *mailbox*. Returns the next state. The…, Set when this box may send its next first email. Fresh jitter every time: a…, send_first_email() (+3 more)

### Community 75 - "TestAliasOptOut"
Cohesion: 0.23
Nodes (9): _box(), Mailbox, Run one mail pass against *fake*; return the leads suppressed by it., A client's unsubscribe button mints a fresh message with no threading headers…, It is a fact about the box before it is a decision about a person., Re-reading a box must be free — the log is keyed on the Message-ID., A network fault is not evidence that there was no mail to read., _read() (+1 more)

### Community 76 - "schemas/deal.py"
Cohesion: 0.22
Nodes (12): CampaignBase, CampaignCreate, CampaignResponse, CampaignUpdate, Config, BaseModel, Config, DealBase (+4 more)

### Community 77 - "QueryNodeAdmin"
Cohesion: 0.15
Nodes (10): CampaignAdmin, KeywordAdmin, display, QueryNodeAdmin, Cold (still part-steering on invented profiles) vs learning (padding retired).…, The discovery walk, node by node — what was searched, how deep, and what it…, The node's keyword set, rendered as the region it searches., First-touch leads this node surfaced. (+2 more)

### Community 78 - "ai_copilot.py"
Cohesion: 0.26
Nodes (12): classify_reply(), CopilotPlanRequest, DatasetAccuracyRequest, generate_campaign_plan(), get_dataset_accuracy_endpoint(), get_lead_360(), BaseModel, get (+4 more)

### Community 79 - "Settings"
Cohesion: 0.17
Nodes (7): Return ordered fallback list of (api_key, model_id) tuples. Rotates between top…, Return list of test recipient dicts from environment variables., Build the database connection URL from individual env vars or DATABASE_URL., Return list of allowed CORS origins from the comma-separated env var., Return the first available OpenRouter API key, falling back to DB config., Settings, BaseSettings

### Community 80 - "ManualProfileModal.jsx"
Cohesion: 0.23
Nodes (9): ExistingProfileViewModal(), inputStyle, labelStyle, ManualProfileModal(), checkLeadDuplicate(), createLead(), executeLeadDuplicateAction(), getLead() (+1 more)

### Community 81 - "_replied_deal"
Cohesion: 0.19
Nodes (9): _decision(), django_db, An EMAILED deal with an unanswered reply — what the reply step picks up., A worded unsubscribe threads normally, so the alias scan can never see it — the…, ``suppress_email`` is keyed on the address, the returned state on the deal. A…, The agent runs for seconds — the query that selected this deal is already out…, _replied_deal(), TestSendGuards (+1 more)

### Community 82 - "._anchored"
Cohesion: 0.22
Nodes (7): Retirement is one countdown: ``ANCHOR_COUNT - n_real_positives``, nothing else., The handover is one-for-one: ground truth displaces the guess a lead at a time,…, The live regression: the budget used to be ``n_neg - n_real_pos``, which is 0…, Rejections are not the clock. A campaign 8 rejections deep with one real…, The countdown is re-applied on every ``set_anchors``, so a stale stored set can…, _rejections(), TestAnchorLifecycle

### Community 83 - "CampaignRunner"
Cohesion: 0.23
Nodes (5): CampaignRunner, Session, Decision Engine: Evaluates engagement events and decides the next step., Background engine that monitors wait countdowns and executes the campaign state…, Deal

### Community 84 - "ApolloLeadProvider"
Cohesion: 0.21
Nodes (7): ApolloLeadProvider, Any, Enrich contact via Apollo People Match., Search organizations via Apollo Organization Search., Verify connection and key validity with Apollo API., Execute Apollo People Search mapped dynamically from AI Campaign Search…, Real B2B Lead Provider for Apollo.io API. Executes dynamic prospect searches…

### Community 85 - "KnowledgeBase.jsx"
Cohesion: 0.26
Nodes (10): ACCEPTED_EXTENSIONS, DropZone(), FILE_TYPE_META, getExt(), KnowledgeBase(), SelectedFilePreview(), getKnowledgeDocs(), searchKnowledge() (+2 more)

### Community 86 - "Command"
Cohesion: 0.27
Nodes (4): Command, BaseCommand, Copy the SQLite file before a destructive reset. No-op on other backends., What the reset would remove, counted before anything is touched.

### Community 87 - "project.py"
Cohesion: 0.29
Nodes (11): _bounced_send(), _dsn_status(), _honour_opt_out(), project(), Message, The outbound message an NDR is reporting on, or None. Looks at every id the…, The enhanced status the report carries ("5.1.1"), or ""., Suppress everyone holding the address this opt-out came from. Enforcement is… (+3 more)

### Community 88 - "threads.py"
Cohesion: 0.24
Nodes (11): assign(), _merge(), atomic, Message, Put *message* in its thread, merging any threads it joins. Returns the thread.…, Messages in the same box that this one answers, or that answer it. Both…, The thread ids among *messages*, ignoring any not yet threaded., Move everything on thread *source_id* onto *target*, then drop the empty… (+3 more)

### Community 89 - "LeadProvider"
Cohesion: 0.53
Nodes (3): ABC, LeadProvider, Abstract Base Class for B2B Lead Providers.

### Community 90 - "ExcelLeadProvider"
Cohesion: 0.27
Nodes (5): ExcelLeadProvider, Any, Extract contacts from the Excel file and format as Lead dictionaries., B2B Lead Provider that loads prospect data directly from an uploaded Excel file…, DataFrame

### Community 91 - "verify_auth"
Cohesion: 0.27
Nodes (8): Auth-check a mailbox over SMTP, then store it — the connect gate. The provider…, Connect with the right transport for *port*, log in, quit. Return ``(ok,…, verify_auth(), A 465-only box connects over SMTP_SSL and never calls STARTTLS. This is the…, test_auth_ok_implicit_ssl_on_465(), test_auth_ok_starttls_on_587(), test_connection_failure_is_reported_not_raised(), test_login_password_rejection_surfaces_app_password_hint()

### Community 92 - "_sent_message"
Cohesion: 0.25
Nodes (6): The assembled EmailMessage for one send, without touching SMTP., Threaded replies go through the same assembly, so they carry it too., One-click is only valid alongside an https: URI — asserting it absent stops a…, The header reaches the filters; this reaches the clients that don't render an…, _sent_message(), TestOptOutIsAdvertised

### Community 93 - "attachments.py"
Cohesion: 0.24
Nodes (9): get_attachment(), get, post, UploadFile, Sanitize original filename to prevent path traversal security issues., Upload an email attachment with format and size validation. Supported…, Retrieve/download an uploaded attachment file., sanitize_filename() (+1 more)

### Community 94 - "RAGService"
Cohesion: 0.31
Nodes (5): Any, Session, RAGService, Retrieval-Augmented Generation Service backed by FastEmbed + PostgreSQL.…, Search using Python-side cosine similarity over JSON-stored embeddings. Falls…

### Community 95 - "_AgentRunner"
Cohesion: 0.20
Nodes (7): Event, _AgentRunner, _get_runner(), _T, Owns one persistent asyncio loop on a dedicated daemon thread. Construct lazily…, Submit *coro* to the runner loop; block until it completes., Return the process-wide runner, creating it on first call.

### Community 96 - "extract_db_path"
Cohesion: 0.27
Nodes (3): extract_db_path(), Strip `--db PATH` / `--db=PATH` out of argv, returning (rest, path_or_None).…, TestExtractDbPath

### Community 97 - "run_daemon"
Cohesion: 0.22
Nodes (10): _import_freemium_campaign(), Run the cycle until the process is stopped or a halting error is raised., Endless round-robin over the operator's campaigns, re-read each lap. Re-reading…, Walk every mailbox's new mail — replies and opt-outs in one pass per box. A…, Pull the published kit once at startup and mirror it into a local campaign.…, read_mail_if_due(), _rotate(), run_daemon() (+2 more)

### Community 98 - "fetch_kit"
Cohesion: 0.31
Nodes (9): download_kit(), fetch_kit(), load_kit_config(), load_kit_model(), Path, Lazy-load and cache the kit. Returns {"config": ..., "model": ...} or None., Download campaign kit from HuggingFace Hub to a temp directory. Returns path or…, Parse config.json from kit directory. Returns dict or None. (+1 more)

### Community 99 - "Any"
Cohesion: 0.22
Nodes (5): Any, Enrich contact or organization information., Search organizations matching target criteria., Check provider API connection health and key validity., Search candidate people/prospects matching target criteria. Returns: Dict with…

### Community 100 - "Dashboard.jsx"
Cohesion: 0.36
Nodes (7): Dashboard(), loadAll(), readCache(), writeCache(), checkDbHealth(), checkHealth(), rawApi()

### Community 101 - "TestSentBodyLogging"
Cohesion: 0.31
Nodes (4): The message text is logged for the operator's own campaigns, never freemium., Signature, opt-out and attribution are the same on every send — noise here., The default stays metadata-only, so a new call site cannot leak by omission., TestSentBodyLogging

### Community 102 - "get_lead_provider"
Cohesion: 0.25
Nodes (8): health_check(), health_db_check(), lead_provider_health(), get, Session, Check Lead Provider (Apollo / Mock) connection status., get_lead_provider(), Factory function to retrieve the configured LeadProvider instance. Supports:…

### Community 103 - "LeadVerificationService"
Cohesion: 0.32
Nodes (5): LeadVerificationService, Any, Verify raw candidate profile fields against retrieved source metadata., Candidate & Source Verification Service. Enforces the Zero-Fabrication Real-…, Batch filter and verify candidate profiles.

### Community 104 - "0003_chatmessage_deal_fk.py"
Cohesion: 0.32
Nodes (7): _clone_into(), delete_legacy_null_urns(), _is_live(), Migration, populate_deal(), Drop the retired send path's NULL-urn rows (stale duplicates of synced msgs)., Materialize a copy of `msg` under another live deal (shared thread). The…

### Community 105 - "._retire_anchors"
Cohesion: 0.25
Nodes (4): Record a new labelled observation. Model is lazily re-fitted. A positive label…, Set the synthetic positives so the GP can fit before any real lead qualifies.…, Trim the anchors down to the budget, in memory and on the campaign. Retires…, Truncate the campaign's stored anchors to the surviving ``keep``. The store is…

### Community 106 - "test_mail_log_backfill.py"
Cohesion: 0.36
Nodes (7): at_the_seam(), _migrate(), django_db, fixture, Move the test database to *targets* and return the resulting model state., The schema one migration before the log exists, and back to head afterwards., test_a_conversation_survives_the_move()

### Community 107 - "MockLeadProvider"
Cohesion: 0.43
Nodes (3): MockLeadProvider, Any, Mock B2B Lead Provider used ONLY for local development when LEAD_PROVIDER=mock.…

### Community 108 - "outbound"
Cohesion: 0.33
Nodes (7): inbound(), outbound(), Message, One send, as ``sender.py`` writes it: classified, processed, in a thread., One received message, already classified — the state after a mail pass., One inbound reply and our answer, both inside an existing thread., _record_reply_exchange()

### Community 109 - "TestColdPhaseAcquisition"
Cohesion: 0.38
Nodes (3): While the only positives are invented, the axis is exploit — see…, A first acceptance does not end the phase — it retires one anchor. The axis…, TestColdPhaseAcquisition

### Community 110 - "_rank_by_score"
Cohesion: 0.33
Nodes (5): _load_profile_embeddings(), _rank_by_score(), Load cached embeddings for a list of profile dicts. Returns list of (profile,…, Rank profiles by raw pipeline.predict() score (descending). Works with any…, Rank profiles by raw model score (descending), skipping missing embeddings.

### Community 111 - "Qualifier"
Cohesion: 0.33
Nodes (3): Qualifier, Common interface for all qualifier implementations. ``rank_profiles`` returns…, Protocol

### Community 112 - "0003_siteconfig.py"
Cohesion: 0.40
Nodes (5): migrate_env_to_db(), Migration, _parse_env(), Read LLM config from .env, store in SiteConfig, then delete .env., Minimal .env parser (no quotes/escapes — matches this project's usage).

### Community 113 - "0011_collapse_prescreen_empties.py"
Cohesion: 0.50
Nodes (4): _clause_key(), collapse_prescreen_empties(), Migration, sha256 of the canonicalized clause set — mirrors ``select.clause_key``.

### Community 114 - "version_string"
Cohesion: 0.50
Nodes (5): The human form: ``2026.08.07+g947927d``, with ``.dirty`` when it applies., The product token sent on every hub call (RFC 9110 form)., user_agent(), version_string(), test_version_string_pairs_the_date_with_the_sha()

### Community 115 - "0003_public_identifier_unique.py"
Cohesion: 0.60
Nodes (4): backfill(), Migration, _public_id_to_url(), _url_to_public_id()

### Community 116 - "0017_migrate_no_email_failures.py"
Cohesion: 0.40
Nodes (3): forwards(), Migration, Move enrichment misses off the FAILED bucket onto their own terminal state.…

### Community 117 - "0003_alter_mailbox_daily_limit.py"
Cohesion: 0.40
Nodes (3): Migration, raise_boxes_on_the_old_default(), Carry existing boxes up to the new cap. Only rows still sitting on the previous…

### Community 118 - "test_mailbox.py"
Cohesion: 0.60
Nodes (4): django_db, test_create_verified_repairs_existing_box_in_place(), test_create_verified_stores_box_when_auth_succeeds(), test_create_verified_stores_nothing_when_auth_rejected()

### Community 120 - "0002_add_sync_fields.py"
Cohesion: 0.50
Nodes (3): delete_old_messages(), Migration, Delete pre-sync ChatMessages that have no linkedin_urn.

### Community 122 - "0008_clause_lattice.py"
Cohesion: 0.50
Nodes (3): erase_legacy_nodes(), Migration, Drop every node. Leads survive (SET_NULL); their labels live on Deal.

### Community 123 - "tokenize"
Cohesion: 0.50
Nodes (4): profile_tokens(), Lowercase word tokens of a text, stopwords stripped. ``sklearn``'s stopword…, The token set of one stored profile — the unit node counting is done over.…, tokenize()

### Community 124 - "0002_rename_description_to_profile_data.py"
Cohesion: 0.50
Nodes (3): convert_description_to_json(), Migration, Parse JSON text in description into profile_data, set empty strings to None.

### Community 125 - "0005_lead_urn.py"
Cohesion: 0.50
Nodes (3): backfill_urn_from_profile_data(), Migration, Promote profile_data['urn'] into the new Lead.urn column. If two leads share…

### Community 128 - "0014_pivot_lead_reshape.py"
Cohesion: 0.50
Nodes (3): Migration, Send stranded LinkedIn deals back into the email funnel (→ Qualified)., remap_connect_states()

### Community 129 - "0018_lead_source_fields_alter_lead_discovered_by.py"
Cohesion: 0.50
Nodes (3): drop_stale_provenance(), Migration, Clear ``discovered_by`` before it is re-pointed at ``QueryNode``. The column…

### Community 130 - "0004_compress_campaign_model_blob.py"
Cohesion: 0.50
Nodes (3): compress_existing_blobs(), Migration, Re-dump each Campaign.model_blob with joblib zlib compression. joblib.load…

### Community 131 - "0007_siteconfig_llm_provider.py"
Cohesion: 0.50
Nodes (3): infer_provider_from_existing_config(), Migration, Set ``llm_provider`` on pre-existing rows based on ``llm_api_base``. Before…

### Community 138 - "_AnchorProfiles"
Cohesion: 0.67
Nodes (3): _AnchorProfiles, BaseModel, The LLM's invented ideal leads, each one line in ``profile_text_for``'s shape.

### Community 145 - "_isolated"
Cohesion: 0.67
Nodes (3): _isolated(), fixture, Point the module at a scratch checkout and clear its per-process cache.

## Knowledge Gaps
- **100 isolated node(s):** `State`, `Migration`, `Meta`, `Status`, `Migration` (+95 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1130 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **56 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LeadFactory` connect `LeadFactory` to `PollOutcome`, `unanswered_replies`, `test_project.py`, `OutreachDecision`, `._box`, `send_first_email`, `test_unsubscribe.py`, `TestAliasOptOut`, `DealFactory`, `conftest.py`, `_box`, `_replied_deal`, `test_summaries.py`, `outreach.py`, `check_lookup`, `test_mail_pass.py`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `update_deal_state_manual()` connect `pipeline.py` to `patch`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `BayesianQualifier` connect `BayesianQualifier` to `TestAnchors`, `logging.py`, `._retire_anchors`, `ensure_anchors`, `TestColdPhaseAcquisition`, `._anchored`, `ndarray`, `qualifier.py`, `test_qualifier.py`, `run_qualification`, `top_up.py`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Are the 113 inferred relationships involving `patch` (e.g. with `_mock_embeddings()` and `_open_sending_window()`) actually correct?**
  _`patch` has 113 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `BayesianQualifier` (e.g. with `run_qualification()` and `_save_qualification_result()`) actually correct?**
  _`BayesianQualifier` has 17 INFERRED edges - model-reasoned connections that need verification._
- **Are the 13 inferred relationships involving `LeadFactory` (e.g. with `deal_with_summaries()` and `TestLoadRecentMessages`) actually correct?**
  _`LeadFactory` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `FakeIMAP` (e.g. with `TestAReplyReachesItsDeal` and `TestPendingIsAState`) actually correct?**
  _`FakeIMAP` has 8 INFERRED edges - model-reasoned connections that need verification._