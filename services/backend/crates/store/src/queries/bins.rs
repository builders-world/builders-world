use domain::world::bins::{PRICE, STEP};
use sqlx::PgExecutor;

/// A bin and how much of its price has been given.
#[derive(Debug)]
pub struct Bin {
    pub spot: String,
    pub funded: i32,
    pub names: Vec<String>,
}

/// The most bins one district shows.
const MOST_SHOWN: i64 = 200;
/// The most givers named on one bin.
const MOST_NAMED: i32 = 12;

pub async fn in_district(executor: impl PgExecutor<'_>, district: &str) -> Result<Vec<Bin>, sqlx::Error> {
    sqlx::query_as!(
        Bin,
        r#"
        SELECT spot, funded, names[1:$3] AS "names!"
        FROM bins
        WHERE district = $1
        ORDER BY spot
        LIMIT $2
        "#,
        district,
        MOST_SHOWN,
        MOST_NAMED
    )
    .fetch_all(executor)
    .await
}

/// Adds one gift to the bin at `spot`, naming the giver once. A bin that is already paid for takes nothing more. The
/// check and the addition are one statement, so two players giving at once can never overfill it.
pub async fn fund(executor: impl PgExecutor<'_>, district: &str, spot: &str, giver: &str) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        INSERT INTO bins (district, spot, funded, names)
        VALUES ($1, $2, LEAST($3::INTEGER, $4::INTEGER), ARRAY[$5::TEXT])
        ON CONFLICT (district, spot) DO UPDATE SET
            funded = LEAST($4::INTEGER, bins.funded + $3::INTEGER),
            names = CASE WHEN $5::TEXT = ANY(bins.names) THEN bins.names ELSE array_append(bins.names, $5::TEXT) END,
            funded_at = now()
        WHERE bins.funded < $4::INTEGER
        "#,
        district,
        spot,
        STEP,
        PRICE,
        giver
    )
    .execute(executor)
    .await?;
    Ok(())
}
