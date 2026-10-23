-- Launch Kit — Claude cost per launch ("cents per launch" for the pitch).
-- Run in the Supabase SQL editor or: psql "$DATABASE_URL" -f scripts/cost-report.sql
-- claude_actions.cost_cents is numeric(8,3), computed in worker/lib/claude.ts#cost() from
-- per-million-token prices; build_seconds is a generated column on launches (finished_at - started_at).

-- 1. Per launch: actions, tokens, cost, build time
select
  l.id                                           as launch_id,
  l.status,
  l.product_title,
  l.created_at,
  l.build_seconds,
  count(a.id)                                    as actions,
  count(a.id) filter (where a.model is not null) as claude_calls,
  coalesce(sum(a.input_tokens), 0)               as input_tokens,
  coalesce(sum(a.output_tokens), 0)              as output_tokens,
  round(coalesce(sum(a.cost_cents), 0), 2)       as cost_cents,
  round(coalesce(sum(a.cost_cents), 0) / 100, 4) as cost_usd,
  string_agg(distinct a.model, ', ')             as models
from launches l
left join claude_actions a on a.launch_id = l.id
group by l.id
order by l.created_at desc;

-- 2. Per step across all finished launches: where the money goes
select
  a.step,
  count(*)                               as calls,
  round(avg(a.input_tokens))             as avg_input_tokens,
  round(avg(a.output_tokens))            as avg_output_tokens,
  round(avg(a.cost_cents), 3)            as avg_cost_cents,
  round(sum(a.cost_cents), 2)            as total_cost_cents,
  round(avg(extract(epoch from (a.finished_at - a.started_at)))::numeric, 1) as avg_seconds
from claude_actions a
join launches l on l.id = a.launch_id
where l.status in ('ready', 'published')
group by a.step
order by total_cost_cents desc;

-- 3. The headline numbers: average cents + seconds per successful live launch
--    (MOCK_MODE rows have no model/tokens, so they are excluded via model is not null)
with per_launch as (
  select l.id, l.build_seconds,
         sum(a.cost_cents)    as cost_cents,
         sum(a.input_tokens)  as input_tokens,
         sum(a.output_tokens) as output_tokens
  from launches l
  join claude_actions a on a.launch_id = l.id and a.model is not null
  where l.status in ('ready', 'published')
  group by l.id
)
select
  count(*)                              as live_launches,
  round(avg(cost_cents), 2)             as avg_cost_cents,
  round(min(cost_cents), 2)             as min_cost_cents,
  round(max(cost_cents), 2)             as max_cost_cents,
  round(avg(input_tokens))              as avg_input_tokens,
  round(avg(output_tokens))             as avg_output_tokens,
  round(avg(build_seconds))             as avg_build_seconds,
  round(percentile_cont(0.5) within group (order by build_seconds)) as p50_build_seconds
from per_launch;
