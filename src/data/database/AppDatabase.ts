/**
 * AppDatabase — SQLite 数据库初始化与 migration
 * 使用 expo-sqlite
 */

import * as SQLite from 'expo-sqlite';

export const DB_NAME = 'legado.db';
export const DB_VERSION = 1;

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  await initSchema(_db);
  return _db;
}

async function initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`PRAGMA journal_mode = WAL;`);
  await db.execAsync(`PRAGMA foreign_keys = ON;`);

  // book_sources
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS book_sources (
      bookSourceUrl     TEXT PRIMARY KEY NOT NULL,
      bookSourceName    TEXT NOT NULL DEFAULT '',
      bookSourceGroup   TEXT,
      bookSourceType    INTEGER NOT NULL DEFAULT 0,
      bookUrlPattern    TEXT,
      customOrder       INTEGER NOT NULL DEFAULT 0,
      enabled           INTEGER NOT NULL DEFAULT 1,
      enabledExplore    INTEGER NOT NULL DEFAULT 1,
      enabledCookieJar  INTEGER DEFAULT 1,
      concurrentRate    TEXT,
      header            TEXT,
      loginUrl          TEXT,
      loginUi           TEXT,
      loginCheckJs      TEXT,
      coverDecodeJs     TEXT,
      jsLib             TEXT,
      bookSourceComment TEXT,
      lastUpdateTime    INTEGER NOT NULL DEFAULT 0,
      respondTime       INTEGER NOT NULL DEFAULT 180000,
      weight            INTEGER NOT NULL DEFAULT 0,
      exploreUrl        TEXT,
      searchUrl         TEXT,
      ruleExplore       TEXT,
      ruleSearch        TEXT,
      ruleBookInfo      TEXT,
      ruleToc           TEXT,
      ruleContent       TEXT
    );
  `);

  // books
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS books (
      bookUrl            TEXT PRIMARY KEY NOT NULL,
      tocUrl             TEXT NOT NULL DEFAULT '',
      origin             TEXT NOT NULL DEFAULT '',
      originName         TEXT NOT NULL DEFAULT '',
      name               TEXT NOT NULL DEFAULT '',
      author             TEXT NOT NULL DEFAULT '',
      kind               TEXT,
      customTag          TEXT,
      coverUrl           TEXT,
      customCoverUrl     TEXT,
      intro              TEXT,
      customIntro        TEXT,
      charset            TEXT,
      type               INTEGER NOT NULL DEFAULT 0,
      bookGroup          INTEGER NOT NULL DEFAULT 0,
      latestChapterTitle TEXT,
      latestChapterTime  INTEGER NOT NULL DEFAULT 0,
      lastCheckTime      INTEGER NOT NULL DEFAULT 0,
      lastCheckCount     INTEGER NOT NULL DEFAULT 0,
      totalChapterNum    INTEGER NOT NULL DEFAULT 0,
      scrollIndex        INTEGER NOT NULL DEFAULT 0,
      durChapterIndex    INTEGER NOT NULL DEFAULT 0,
      durChapterPos      INTEGER NOT NULL DEFAULT 0,
      durChapterTime     INTEGER NOT NULL DEFAULT 0,
      wordCount          TEXT,
      canUpdate          INTEGER NOT NULL DEFAULT 1,
      bookOrder          INTEGER NOT NULL DEFAULT 0,
      useReplaceRule     INTEGER,
      hasImageContent    INTEGER,
      variable           TEXT
    );
  `);

  // book_chapters
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS book_chapters (
      url             TEXT NOT NULL,
      bookUrl         TEXT NOT NULL,
      title           TEXT NOT NULL DEFAULT '',
      idx             INTEGER NOT NULL DEFAULT 0,
      resourceUrl     TEXT,
      tag             TEXT,
      start           INTEGER,
      end             INTEGER,
      isVolume        INTEGER NOT NULL DEFAULT 0,
      isVip           INTEGER NOT NULL DEFAULT 0,
      isPay           INTEGER NOT NULL DEFAULT 0,
      updateTime      TEXT,
      variable        TEXT,
      PRIMARY KEY (url, bookUrl),
      FOREIGN KEY (bookUrl) REFERENCES books(bookUrl) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_chapters_bookUrl ON book_chapters(bookUrl);
  `);

  // book_groups
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS book_groups (
      groupId   INTEGER PRIMARY KEY NOT NULL,
      groupName TEXT NOT NULL DEFAULT '',
      groupOrder INTEGER NOT NULL DEFAULT 0,
      show      INTEGER NOT NULL DEFAULT 1
    );
    INSERT OR IGNORE INTO book_groups (groupId, groupName, groupOrder, show)
    VALUES (-1, '全部', -10, 1),
           (-2, '本地', -9, 1),
           (-3, '音频', -8, 1),
           (-4, '未分组', -7, 1);
  `);

  // replace_rules
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS replace_rules (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      name                TEXT NOT NULL DEFAULT '',
      ruleGroup           TEXT,
      pattern             TEXT NOT NULL DEFAULT '',
      replacement         TEXT NOT NULL DEFAULT '',
      isRegex             INTEGER NOT NULL DEFAULT 0,
      scope               TEXT,
      scopeTitle          INTEGER,
      scopeContent        INTEGER,
      timeoutMillisecond  INTEGER,
      enabled             INTEGER NOT NULL DEFAULT 1,
      ruleOrder           INTEGER NOT NULL DEFAULT 0
    );
  `);

  // read_config
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS read_config (
      id              INTEGER PRIMARY KEY NOT NULL,
      name            TEXT NOT NULL DEFAULT '默认',
      bgStr           TEXT,
      bgStrNight      TEXT,
      bgType          INTEGER NOT NULL DEFAULT 0,
      bgTypeNight     INTEGER NOT NULL DEFAULT 0,
      textColor       TEXT NOT NULL DEFAULT '#333333',
      textColorNight  TEXT NOT NULL DEFAULT '#AAAAAA',
      textSize        INTEGER NOT NULL DEFAULT 18,
      letterSpacing   REAL NOT NULL DEFAULT 0,
      lineSpacingExtra REAL NOT NULL DEFAULT 12,
      paraSpacing     REAL NOT NULL DEFAULT 16,
      fontPath        TEXT,
      fontName        TEXT,
      paddingLeft     INTEGER NOT NULL DEFAULT 16,
      paddingTop      INTEGER NOT NULL DEFAULT 16,
      paddingRight    INTEGER NOT NULL DEFAULT 16,
      paddingBottom   INTEGER NOT NULL DEFAULT 32,
      pageAnim        INTEGER NOT NULL DEFAULT 2,
      titleSize       INTEGER NOT NULL DEFAULT 20,
      titleAlign      INTEGER NOT NULL DEFAULT 1,
      indent          INTEGER NOT NULL DEFAULT 2
    );
    INSERT OR IGNORE INTO read_config (id, name) VALUES (1, '默认');
  `);
}
