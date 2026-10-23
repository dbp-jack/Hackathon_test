-- POST /launches inserts the launch row before its source_media rows; a worker polling in between
-- would claim a launch with no inputs and fail it. Only hand out launches that already have media.
create or replace function claim_next_launch() returns launches as $$
  update launches set status = 'analyzing', started_at = now()
  where id = (
    select l.id from launches l
    where l.status = 'uploaded' and exists (select 1 from source_media m where m.launch_id = l.id)
    order by l.created_at limit 1 for update skip locked)
  returning *;
$$ language sql;
