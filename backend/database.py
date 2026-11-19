import psycopg2
import os
import json
from passlib.context import CryptContext
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://admin:123456@localhost:5432/mental_checkin"
)

pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")


def get_connection():
    return psycopg2.connect(DATABASE_URL)


# ==========================================
# PHASE 2 HELPER FUNCTIONS (BASELINE & TREND)
# ==========================================

def get_student_baseline(student_id: int):
    """Retrieve personal baseline for a student."""
    conn = get_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM student_baseline WHERE student_id = %s", (student_id,))
        return cur.fetchone()
    finally:
        conn.close()


def upsert_student_baseline(student_id: int, data: dict):
    """Insert or update a student's personal baseline."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO student_baseline 
            (student_id, neg_score_mean, neg_score_std, perclos_mean, blink_rate_mean, sample_count, last_updated)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (student_id) DO UPDATE SET
                neg_score_mean = EXCLUDED.neg_score_mean,
                neg_score_std = EXCLUDED.neg_score_std,
                perclos_mean = EXCLUDED.perclos_mean,
                blink_rate_mean = EXCLUDED.blink_rate_mean,
                sample_count = EXCLUDED.sample_count,
                last_updated = NOW()
        """, (
            student_id,
            data.get('neg_score_mean', 0),
            data.get('neg_score_std', 0),
            data.get('perclos_mean', 0),
            data.get('blink_rate_mean', 0),
            data.get('sample_count', 0)
        ))
        conn.commit()
    finally:
        conn.close()


def init_db():
    """Tạo tất cả bảng và seed data mẫu (DB Wipe)"""
    conn = get_connection()
    cur = conn.cursor()

    # Xoá bảng cũ để reset lại schema
    cur.execute("""
        DROP TABLE IF EXISTS checkin_answers CASCADE;
        DROP TABLE IF EXISTS checkin CASCADE;
        DROP TABLE IF EXISTS trend_report CASCADE;
        DROP TABLE IF EXISTS student_baseline CASCADE;
        DROP TABLE IF EXISTS questions CASCADE;
        DROP TABLE IF EXISTS topics CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
    """)

    # 1. Bảng users
    cur.execute("""
        CREATE TABLE users (
            id          SERIAL PRIMARY KEY,
            username    VARCHAR(50) UNIQUE NOT NULL,
            password    VARCHAR(255) NOT NULL,
            role        VARCHAR(10) NOT NULL DEFAULT 'student',
            full_name   VARCHAR(100),
            class_name  VARCHAR(20),
            created_at  TIMESTAMP DEFAULT NOW()
        );
    """)

    # 2. Bảng topics (Chủ đề)
    cur.execute("""
        CREATE TABLE topics (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            description TEXT
        );
    """)

    # 3. Bảng questions (Câu hỏi)
    cur.execute("""
        CREATE TABLE questions (
            id SERIAL PRIMARY KEY,
            topic_id INT REFERENCES topics(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            type VARCHAR(50) DEFAULT 'radio',
            options JSONB,
            is_sensitive VARCHAR(20) DEFAULT 'none',
            recommendation_text TEXT,
            is_active BOOLEAN DEFAULT TRUE
        );
    """)

    # 4. Bảng checkin
    cur.execute("""
        CREATE TABLE checkin (
            id           SERIAL PRIMARY KEY,
            user_id      INT REFERENCES users(id) ON DELETE CASCADE,
            happy        FLOAT DEFAULT 0,
            sad          FLOAT DEFAULT 0,
            neutral      FLOAT DEFAULT 0,
            angry        FLOAT DEFAULT 0,
            fear         FLOAT DEFAULT 0,
            disgust      FLOAT DEFAULT 0,
            surprise     FLOAT DEFAULT 0,
            dominant     VARCHAR(20),
            risk_score   FLOAT DEFAULT 0,
            risk_level   VARCHAR(20) DEFAULT 'normal',
            data_quality VARCHAR(20) DEFAULT 'reliable',
            raw_metrics  JSONB,
            student_note TEXT,
            created_at   TIMESTAMP DEFAULT NOW()
        );
    """)

    # 5. Bảng checkin_answers (Câu trả lời chi tiết)
    cur.execute("""
        CREATE TABLE checkin_answers (
            id SERIAL PRIMARY KEY,
            checkin_id INT REFERENCES checkin(id) ON DELETE CASCADE,
            question_id INT REFERENCES questions(id) ON DELETE CASCADE,
            answer_value VARCHAR(255),
            risk_weight INT DEFAULT 0
        );
    """)

    # 6. Bảng student_baseline (Module 3 - Cập nhật Baseline)
    cur.execute("""
        CREATE TABLE student_baseline (
            student_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            neg_score_mean FLOAT DEFAULT 0,
            neg_score_std FLOAT DEFAULT 0,
            perclos_mean FLOAT DEFAULT 0,
            blink_rate_mean FLOAT DEFAULT 0,
            sample_count INT DEFAULT 0,
            last_updated TIMESTAMP DEFAULT NOW()
        );
    """)

    # 7. Bảng trend_report (Module 5 - Trend Layer)
    cur.execute("""
        CREATE TABLE trend_report (
            id SERIAL PRIMARY KEY,
            student_id INT REFERENCES users(id) ON DELETE CASCADE,
            week_start_date DATE,
            warning_count INT DEFAULT 0,
            trend_slope FLOAT DEFAULT 0,
            trend_alert BOOLEAN DEFAULT FALSE,
            reviewed_by_counselor BOOLEAN DEFAULT FALSE,
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
    """)

    conn.commit()

    # --- SEED DATA ---
    # Users
    admin_pw = pwd_context.hash("admin123")
    cur.execute("""
        INSERT INTO users (username, password, role, full_name)
        VALUES (%s, %s, 'admin', %s)
    """, ("admin", admin_pw, "Nguyễn Thị Lan"))

    students = [
        ("hs001", "Trần Minh Khoa",    "12A1"),
        ("hs002", "Lê Thị Hoa",        "12A1"),
        ("hs003", "Phạm Văn Đức",      "12A1"),
        ("hs004", "Nguyễn Thị Mai",    "12A2"),
        ("hs005", "Hoàng Minh Tuấn",   "12A2"),
    ]
    pw = pwd_context.hash("pass123")
    for username, full_name, class_name in students:
        cur.execute("""
            INSERT INTO users (username, password, role, full_name, class_name)
            VALUES (%s, %s, 'student', %s, %s)
        """, (username, pw, full_name, class_name))

    # Topics
    topics_data = [
        ("Sức khỏe Thể chất & Giấc ngủ", "Đánh giá tình trạng ăn ngủ và năng lượng"),
        ("Cảm xúc & Áp lực học tập", "Đánh giá stress, lo âu trong học tập"),
        ("Mối quan hệ & Xã hội", "Giao tiếp với bạn bè, gia đình, thầy cô")
    ]
    cur.executemany("INSERT INTO topics (name, description) VALUES (%s, %s)", topics_data)
    
    # Lấy id các topics
    cur.execute("SELECT id, name FROM topics ORDER BY id")
    topics_ids = {name: tid for tid, name in cur.fetchall()}
    
    # Questions (Seed data phong phú)
    t_health = topics_ids["Sức khỏe Thể chất & Giấc ngủ"]
    t_emotion = topics_ids["Cảm xúc & Áp lực học tập"]
    t_social = topics_ids["Mối quan hệ & Xã hội"]
    
    # Cấu hình Percentage (100% là tốt, 0% là tệ)
    pct_good = json.dumps([
        {"label": "Rất tệ", "weight": 5, "value": 0},
        {"label": "Rất tốt", "weight": 0, "value": 100}
    ], ensure_ascii=False)

    # Cấu hình Percentage ngược (100% là tệ/căng thẳng, 0% là thoải mái)
    pct_bad = json.dumps([
        {"label": "Rất thoải mái", "weight": 0, "value": 0},
        {"label": "Rất căng thẳng", "weight": 5, "value": 100}
    ], ensure_ascii=False)
    
    # Cấu hình radio tần suất (PHQ-9 style)
    freq_options = json.dumps([
        {"label": "Không bao giờ", "weight": 0},
        {"label": "Thỉnh thoảng", "weight": 1},
        {"label": "Thường xuyên", "weight": 3},
        {"label": "Hầu như mỗi ngày", "weight": 5}
    ], ensure_ascii=False)
    
    questions_data = [
        # Topic 1 - Sức khoẻ & Giấc ngủ
        (t_health, "Đêm qua bạn ngủ khoảng bao nhiêu tiếng?", "radio", json.dumps([
            {"label": "Dưới 4 tiếng", "weight": 5},
            {"label": "4-6 tiếng", "weight": 3},
            {"label": "6-8 tiếng", "weight": 0},
            {"label": "Trên 8 tiếng", "weight": 0}
        ], ensure_ascii=False), "none", "Ngủ quá ít sẽ khiến não bộ khó phục hồi. Hãy thử tắm nước ấm hoặc đọc sách nhẹ nhàng trước khi ngủ để dễ vào giấc hơn nhé."),
        (t_health, "Chất lượng giấc ngủ của bạn đêm qua?", "percentage", pct_good, "none", "Giấc ngủ kém chất lượng thường do stress kéo dài. Hãy thử bài tập hít thở sâu 4-7-8 trước khi ngủ để thư giãn hệ thần kinh."),
        (t_health, "Bạn có cảm thấy mệt mỏi, thiếu năng lượng vào buổi sáng không?", "radio", freq_options, "none", "Khởi đầu ngày mới uể oải có thể do thiếu ngủ hoặc thiếu chất. Một ly nước ấm và vài động tác vươn vai có thể giúp đánh thức cơ thể."),
        (t_health, "Mức độ thèm ăn của bạn dạo này thế nào?", "percentage", pct_good, "none", "Sự thay đổi về thèm ăn là dấu hiệu cơ thể đang phản ứng với áp lực. Hãy cố gắng chia nhỏ bữa ăn thay vì nhịn đói."),
        (t_health, "Bạn có bị đau đầu hay đau dạ dày vô cớ không?", "radio", freq_options, "none", "Cơ thể và tâm trí có sự liên kết chặt chẽ. Đau dạ dày hoặc đau đầu thường là cách cơ thể báo hiệu bạn đang quá tải căng thẳng. Hãy chú ý thư giãn và ăn uống đúng giờ."),
        (t_health, "Mức độ tỉnh táo của bạn trong lớp học?", "percentage", pct_good, "none", "Mất tỉnh táo liên tục báo động tình trạng cạn kiệt năng lượng. Hãy thử đứng dậy đi lại vài vòng giữa giờ giải lao hoặc rửa mặt bằng nước mát."),
        (t_health, "Bạn có hay bị giật mình thức giấc giữa đêm không?", "radio", freq_options, "none", "Giật mình nửa đêm thường do lo âu tiềm ẩn. Hạn chế sử dụng thiết bị điện tử ít nhất 1 giờ trước khi ngủ có thể giúp cải thiện tình trạng này."),
        (t_health, "Dạo này bạn có hay bỏ bữa sáng không?", "radio", freq_options, "none", "Bỏ bữa sáng làm giảm đường huyết, gây mất tập trung và dễ cáu gắt. Hãy cố gắng mang theo một chút bánh quy hoặc sữa nếu không kịp ăn."),
        (t_health, "Mức độ hoạt động thể chất (thể dục, đi bộ, chơi thể thao) của bạn trong tuần qua?", "percentage", pct_good, "none", "Ít vận động làm tích tụ hoóc môn căng thẳng (Cortisol). Đi bộ nhẹ nhàng 15 phút mỗi ngày cũng đủ để giải phóng Endorphin giúp bạn thấy yêu đời hơn."),
        (t_health, "Bạn có thấy khó vào giấc ngủ khi nằm lên giường không?", "radio", freq_options, "none", "Khó vào giấc thường do não bộ chưa được 'tắt' khỏi công việc/học tập. Hãy viết những suy nghĩ đang dang dở ra giấy để đầu óc được nhẹ nhõm hơn trước khi ngủ."),
        
        # Topic 2 - Cảm xúc & Áp lực
        (t_emotion, "Mức độ áp lực/căng thẳng của bạn trong tuần qua?", "percentage", pct_bad, "none", "Căng thẳng kéo dài rất nguy hiểm. Bạn có thể chia sẻ những áp lực này với giáo viên qua ô Tâm sự phía dưới, hoặc tìm ai đó tin tưởng để trò chuyện."),
        (t_emotion, "Bạn có cảm thấy chán nản hay tuyệt vọng không?", "radio", freq_options, "level_2", "Cảm giác tuyệt vọng thường ập đến khi ta ôm đồm quá nhiều. Hãy nhớ rằng bạn không phải đối mặt với khó khăn một mình, luôn có thầy cô và gia đình sẵn sàng lắng nghe."),
        (t_emotion, "Khả năng tập trung của bạn trong giờ học?", "percentage", pct_good, "none", "Khi não bộ quá mệt mỏi, sự tập trung sẽ giảm sút. Đừng ép bản thân quá mức, hãy thử áp dụng phương pháp học Pomodoro (25p học - 5p nghỉ)."),
        (t_emotion, "Bạn có hay lo lắng thái quá về kết quả bài kiểm tra không?", "radio", freq_options, "none", "Điểm số không định nghĩa giá trị con người bạn. Sự lo lắng thái quá có thể làm bạn mất đi phong độ vốn có. Hãy hít thở sâu trước khi bắt đầu làm bài."),
        (t_emotion, "Bạn có suy nghĩ tiêu cực hoặc cảm giác mình là người thất bại không?", "radio", freq_options, "level_2", "Cảm giác bản thân thất bại là một đám mây đen đang che khuất những ưu điểm của bạn. Bạn đã và đang cố gắng rất nhiều, hãy tự ghi nhận những nỗ lực dù là nhỏ nhất của mình!"),
        (t_emotion, "Bạn có hay khóc thầm hoặc muốn khóc mà không rõ lý do?", "radio", freq_options, "level_1", "Khóc là một cách giải tỏa tự nhiên của cơ thể. Đừng kìm nén, nhưng nếu tình trạng này kéo dài, bạn rất cần một bờ vai để tựa vào lúc này đấy."),
        (t_emotion, "Mức độ hài lòng của bạn về bản thân hiện tại?", "percentage", pct_good, "none", "Đôi khi chúng ta khắt khe với bản thân quá mức. Hãy thử viết ra 3 điều bạn đã làm tốt trong tuần qua để thấy mình tuyệt vời hơn bạn nghĩ."),
        (t_emotion, "Bạn có dễ nổi nóng hay cáu gắt với những chuyện nhỏ nhặt không?", "radio", freq_options, "none", "Sự cáu gắt thường là lớp khiên bảo vệ khi bên trong bạn đang kiệt sức. Hãy tìm một không gian yên tĩnh, nghe một bản nhạc không lời để làm dịu lại tâm trí."),

        # Topic 3 - Mối quan hệ
        (t_social, "Bạn có cảm thấy thoải mái khi chia sẻ với bạn bè trong lớp không?", "percentage", pct_good, "none", "Nếu cảm thấy khó kết nối với số đông, hãy bắt đầu bằng việc tìm một người bạn có chung sở thích nhỏ, hoặc chủ động nở nụ cười khi chạm mặt."),
        (t_social, "Bạn có cảm thấy cô đơn ngay cả khi ở chỗ đông người?", "radio", freq_options, "level_1", "Sự lạc lõng giữa đám đông cho thấy bạn chưa tìm được người thực sự 'hiểu' mình. Không sao cả, hãy kiên nhẫn mở lòng hoặc trò chuyện với thầy cô/chuyên viên tâm lý nhé."),
        (t_social, "Tần suất xảy ra mâu thuẫn/cãi vã với gia đình dạo này?", "radio", freq_options, "none", "Mâu thuẫn gia đình thường mang lại áp lực rất lớn. Nếu chưa thể giải quyết bằng lời nói, hãy thử viết một bức thư ngắn gửi cho bố mẹ để bày tỏ suy nghĩ thật của mình."),
        (t_social, "Bạn có người để tâm sự khi gặp khó khăn không?", "radio", json.dumps([
            {"label": "Có rất nhiều", "weight": 0},
            {"label": "Có một vài người", "weight": 0},
            {"label": "Chỉ có một người", "weight": 1},
            {"label": "Không có ai", "weight": 5}
        ], ensure_ascii=False), "level_1", "Khi cảm thấy không có ai để tâm sự, hãy nhớ rằng thầy cô luôn sẵn sàng lắng nghe bạn qua ô 'Tâm sự' ở Check-in này. Bạn không hề cô độc!"),
        (t_social, "Bạn có hay bị bạn bè trêu chọc quá mức hoặc bắt nạt không?", "radio", freq_options, "level_1", "Bị bắt nạt dưới bất kỳ hình thức nào đều không thể chấp nhận được. Bạn hãy ngay lập tức báo cáo với GVCN hoặc người thân để được can thiệp và bảo vệ nhé!"),
        (t_social, "Bạn có cảm thấy áp lực từ sự kỳ vọng của cha mẹ không?", "radio", freq_options, "none", "Cha mẹ luôn mong điều tốt nhất nhưng đôi khi lại vô tình tạo áp lực. Đừng ôm nỗi sợ một mình, hãy tìm cơ hội thích hợp để tâm sự thẳng thắn về giới hạn của bạn với gia đình."),
        (t_social, "Sự hỗ trợ từ thầy cô khi bạn gặp khó khăn trong học tập?", "percentage", pct_good, "none", "Nếu bạn đang chật vật với môn học, đừng ngại giơ tay hoặc nhắn tin nhờ thầy cô giảng lại. Thầy cô luôn đánh giá cao những học sinh chủ động tìm kiếm sự giúp đỡ!"),
    ]
    
    cur.executemany("""
        INSERT INTO questions (topic_id, title, type, options, is_sensitive, recommendation_text)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, questions_data)

    conn.commit()
    print("✅ Seed data MVP2 tạo xong! (Wiped and Recreated)")
    cur.close()
    conn.close()


# ── Auth ──────────────────────────────────────────────
def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def get_user_by_username(username: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, username, password, role, full_name, class_name FROM users WHERE username = %s", (username,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row: return None
    return {"id": row[0], "username": row[1], "password": row[2], "role": row[3], "full_name": row[4], "class_name": row[5]}


def get_user_by_id(user_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, username, role, full_name, class_name FROM users WHERE id = %s", (user_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row: return None
    return {"id": row[0], "username": row[1], "role": row[2], "full_name": row[3], "class_name": row[4]}


# ── Questions ────────────────────────────────────────
def get_random_questions(limit: int = 15):
    """Lấy ngẫu nhiên các câu hỏi từ các chủ đề"""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT q.id, q.title, q.type, q.options, q.is_sensitive, t.name as topic_name
        FROM questions q
        JOIN topics t ON q.topic_id = t.id
        WHERE q.is_active = TRUE
        ORDER BY RANDOM()
        LIMIT %s
    """, (limit,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    
    return [
        {
            "id": r[0],
            "title": r[1],
            "type": r[2],
            "options": r[3] if isinstance(r[3], list) else json.loads(r[3] or "[]"),
            "is_sensitive": r[4],
            "topic_name": r[5]
        }
        for r in rows
    ]


def get_all_topics_with_questions():
    """Dành cho admin xem danh sách bộ câu hỏi"""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, name, description FROM topics ORDER BY id")
    topics_rows = cur.fetchall()
    
    cur.execute("""
        SELECT id, topic_id, title, type, options, is_active
        FROM questions ORDER BY topic_id, id
    """)
    questions_rows = cur.fetchall()
    cur.close()
    conn.close()
    
    topics = []
    for tr in topics_rows:
        qs = [{"id": qr[0], "title": qr[2], "type": qr[3], "options": qr[4], "is_active": qr[5]} 
              for qr in questions_rows if qr[1] == tr[0]]
        topics.append({
            "id": tr[0], "name": tr[1], "description": tr[2], "questions": qs
        })
    return topics


# ── Checkin CRUD ──────────────────────────────────────
def save_checkin(user_id: int, emotions: dict, dominant: str, risk: dict, answers: list, data_quality: str = 'reliable', raw_metrics: dict = None, student_note: str = ""):
    """
    Lưu checkin kèm danh sách câu trả lời
    answers = [{"question_id": 1, "value": "Thường xuyên", "weight": 5}, ...]
    """
    conn = get_connection()
    cur = conn.cursor()
    
    # 1. Lưu checkin header
    cur.execute("""
        INSERT INTO checkin
        (user_id, happy, sad, neutral, angry, fear, disgust, surprise,
         dominant, risk_score, risk_level, data_quality, raw_metrics, student_note)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        RETURNING id
    """, (
        user_id,
        emotions.get("happy", 0), emotions.get("sad", 0),
        emotions.get("neutral", 0), emotions.get("angry", 0),
        emotions.get("fear", 0), emotions.get("disgust", 0),
        emotions.get("surprise", 0),
        dominant, risk["score"], risk["level"],
        data_quality, json.dumps(raw_metrics) if raw_metrics else None,
        student_note
    ))
    checkin_id = cur.fetchone()[0]
    
    # 2. Lưu chi tiết câu trả lời
    if answers:
        values = [(checkin_id, a["question_id"], a["value"], a["weight"]) for a in answers]
        cur.executemany("""
            INSERT INTO checkin_answers (checkin_id, question_id, answer_value, risk_weight)
            VALUES (%s, %s, %s, %s)
        """, values)
        
    conn.commit()
    cur.close()
    conn.close()
    return checkin_id


def get_today_checkins():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT c.id, u.id, u.full_name, u.class_name,
               c.dominant, c.risk_score, c.risk_level,
               c.happy, c.sad, c.neutral, c.angry,
               c.created_at
        FROM checkin c
        JOIN users u ON c.user_id = u.id
        WHERE DATE(c.created_at) = CURRENT_DATE
        ORDER BY c.created_at DESC
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [
        {
            "checkin_id": r[0], "user_id": r[1], "full_name": r[2],
            "class_name": r[3], "dominant": r[4],
            "risk_score": r[5], "risk_level": r[6],
            "happy": r[7], "sad": r[8], "neutral": r[9], "angry": r[10],
            "created_at": str(r[11])
        }
        for r in rows
    ]


def get_all_students():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, username, full_name, class_name FROM users WHERE role = 'student' ORDER BY class_name, full_name")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [{"id": r[0], "username": r[1], "full_name": r[2], "class_name": r[3]} for r in rows]


def get_student_history(user_id: int, limit: int = 7):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, happy, sad, neutral, angry, fear,
               dominant, risk_score, risk_level, created_at
        FROM checkin
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT %s
    """, (user_id, limit))
    rows = cur.fetchall()
    
    # Kèm thêm chi tiết answers cho lịch sử
    history = []
    for r in rows:
        checkin_id = r[0]
        cur.execute("""
            SELECT q.title, a.answer_value, a.risk_weight
            FROM checkin_answers a
            JOIN questions q ON a.question_id = q.id
            WHERE a.checkin_id = %s
        """, (checkin_id,))
        answers = [{"question": ar[0], "answer": ar[1], "weight": ar[2]} for ar in cur.fetchall()]
        
        history.append({
            "id": r[0], "happy": r[1], "sad": r[2], "neutral": r[3],
            "angry": r[4], "fear": r[5], "dominant": r[6],
            "risk_score": r[7], "risk_level": r[8],
            "created_at": str(r[9]),
            "answers": answers
        })
        
    cur.close()
    conn.close()
    return history


def get_today_checkin_user_ids():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT user_id FROM checkin WHERE DATE(created_at) = CURRENT_DATE")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [r[0] for r in rows]


def get_all_checkins_for_export():
    """Lấy toàn bộ dữ liệu checkin để xuất ra Excel"""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT c.id, u.full_name, u.class_name, c.created_at,
               c.dominant, c.risk_score, c.risk_level,
               c.happy, c.sad, c.angry, c.fear
        FROM checkin c
        JOIN users u ON c.user_id = u.id
        ORDER BY c.created_at DESC
    """)
    checkin_rows = cur.fetchall()
    
    # Lấy thêm answers cho từng checkin
    export_data = []
    for cr in checkin_rows:
        cid = cr[0]
        cur.execute("""
            SELECT q.title, a.answer_value, a.risk_weight, t.name
            FROM checkin_answers a
            JOIN questions q ON a.question_id = q.id
            JOIN topics t ON q.topic_id = t.id
            WHERE a.checkin_id = %s
        """, (cid,))
        answers = [{"topic": ar[3], "question": ar[0], "answer": ar[1], "weight": ar[2]} for ar in cur.fetchall()]
        
        export_data.append({
            "checkin_id": cid,
            "full_name": cr[1],
            "class_name": cr[2],
            "date": str(cr[3]),
            "dominant_emotion": cr[4],
            "risk_score": cr[5],
            "risk_level": cr[6],
            "happy": cr[7],
            "sad": cr[8],
            "angry": cr[9],
            "fear": cr[10],
            "answers": answers
        })
        
    cur.close()
    conn.close()
    return export_data


def compute_all_trends():
    """Module 5 (Trend Layer): Calculate linear regression slope for last 5 checkins over max 2 weeks."""
    conn = get_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # Fetch students who had a checkin in the last 2 weeks
        cur.execute("""
            SELECT DISTINCT student_id 
            FROM checkin 
            WHERE created_at >= NOW() - INTERVAL '14 days'
        """)
        students = [row['student_id'] for row in cur.fetchall()]
        
        results = []
        for sid in students:
            # Get last 5 checkins
            cur.execute("""
                SELECT risk_level, risk_score as neg_score, created_at 
                FROM checkin 
                WHERE student_id = %s AND created_at >= NOW() - INTERVAL '14 days'
                ORDER BY created_at DESC 
                LIMIT 5
            """, (sid,))
            checkins = cur.fetchall()
            
            if len(checkins) < 3:
                continue # Cần ít nhất 3 điểm để tính trend hợp lý
                
            checkins.reverse() # Sort chronological
            
            # Count warnings/criticals
            warning_or_above = sum(1 for c in checkins if c['risk_level'] in ['warning', 'critical'])
            
            # Linear regression for neg_score
            y = [float(c['neg_score']) for c in checkins if c.get('neg_score') is not None]
            if len(y) < 3:
                continue
                
            x = list(range(len(y)))
            n = len(y)
            sum_x = sum(x)
            sum_y = sum(y)
            sum_xy = sum(x[i]*y[i] for i in range(n))
            sum_xx = sum(x[i]**2 for i in range(n))
            
            denominator = n * sum_xx - sum_x**2
            slope = (n * sum_xy - sum_x * sum_y) / denominator if denominator != 0 else 0
            
            trend_alert = False
            reasons = []
            if warning_or_above >= 3:
                trend_alert = True
                reasons.append("persistent_pattern_5_sessions")
            if slope > 5.0: # threshold_slope
                trend_alert = True
                reasons.append("rising_trend_2_weeks")
                
            if trend_alert:
                cur.execute("""
                    INSERT INTO trend_report (student_id, week_start_date, warning_count, trend_slope, trend_alert, notes)
                    VALUES (%s, DATE_TRUNC('week', NOW()), %s, %s, %s, %s)
                """, (sid, warning_or_above, slope, True, ", ".join(reasons)))
                results.append({"student_id": sid, "slope": slope, "warning_count": warning_or_above})
        
        conn.commit()
        return results
    finally:
        conn.close()
