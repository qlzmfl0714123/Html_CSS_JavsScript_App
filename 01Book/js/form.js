// DOM 참조
const $form = document.getElementById("bookForm");
const $rows = document.getElementById("bookRows");
const $msg  = document.getElementById("message");
const $loadAll = document.getElementById("loadAll");

/**
 * 도서 객체 유효성 검증
 * @param {Object} book {title, author, isbn, price, publishDate}
 * @returns {{ok:boolean, message?:string}}
 */
function validateStudent(book) {  

  const title = (book.title ?? "").trim();
  const author = (book.author ?? "").trim();
  const isbn = (book.isbn ?? "").trim();
  const price = (book.price ?? "").toString().trim();
  const publishDate = (book.publishDate ?? "").trim();

  if (!title || !author || !isbn || !price || !publishDate) {
    return { ok: false, message: "모든 값을 입력해주세요." };
  }

  if (!/^[0-9\-]{10,17}$/.test(isbn)) {
    return { ok: false, message: "ISBN 형식이 올바르지 않습니다." };
  }

  const priceNum = Number(price);
  if (Number.isNaN(priceNum) || priceNum < 0) {
    return { ok: false, message: "가격은 0 이상의 숫자여야 합니다." };
  }

  // 출판일 미래 불가
  const sel = new Date(publishDate);
  const today = new Date(); today.setHours(0,0,0,0);
  if (isFinite(sel) && sel > today) {
    return { ok: false, message: "출판일은 오늘 이후일 수 없습니다." };
  }

  return { ok: true };
}

function renderRows(list = []) {
  $rows.innerHTML = list.map(b => `
    <tr>
      <td>${escapeHtml(b.title)}</td>
      <td>${escapeHtml(b.author)}</td>
      <td>${escapeHtml(b.isbn)}</td>
      <td>${b.price ?? ""}</td>
      <td>${escapeHtml(b.publishDate)}</td>
    </tr>
  `).join("");
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}

$form.addEventListener("submit", async (e) => {
  e.preventDefault();
  $msg.textContent = "";
  $msg.className = "helper";

  const fd = new FormData($form);
  const book = Object.fromEntries(fd.entries());

  const vr = validateStudent(book);
  if (!vr.ok) {
    $msg.textContent = vr.message;
    $msg.className = "error";
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/books`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(book),
    });
    if (!res.ok) throw new Error(`등록 실패: ${res.status}`);
    const saved = await res.json();

    $msg.textContent = "등록 성공!";
    $msg.className = "success";
    renderRows([saved]);
    $form.reset();
  } catch (err) {
    $msg.textContent = err.message;
    $msg.className = "error";
  }
});

$loadAll.addEventListener("click", async () => {
  $msg.textContent = "";
  $msg.className = "helper";
  try {
    const res = await fetch(`${API_BASE_URL}/api/books`);
    if (!res.ok) throw new Error(`조회 실패: ${res.status}`);
    const list = await res.json();
    renderRows(list);
  } catch (err) {
    $msg.textContent = err.message;
    $msg.className = "error";
  }
});