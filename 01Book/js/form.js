let editingBookId = null; 

const $form = document.getElementById("bookForm");
const $rows = document.getElementById("bookRows");
const $msg  = document.getElementById("message");

const submitButton = document.querySelector("#submitButton");
const cancelButton = document.querySelector("#cancelButton");
const editBadge    = document.querySelector("#editBadge");
const loadAllBtn   = document.querySelector("#loadAll");

function showInfo(msg)  { $msg.textContent = msg; $msg.className = "helper"; }
function showError(msg) { $msg.textContent = msg; $msg.className = "error"; }
function showSuccess(msg){ $msg.textContent = msg; $msg.className = "success"; }

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}

function toggleEditMode(on) {
  editingBookId = on ? editingBookId : null;
  submitButton.textContent = on ? "수정 완료" : "등록";
  cancelButton.classList.toggle("hidden", !on);
  editBadge.classList.toggle("hidden", !on);
}

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
  const sel = new Date(publishDate);
  const today = new Date(); today.setHours(0,0,0,0);
  if (isFinite(sel) && sel > today) {
    return { ok: false, message: "출판일은 오늘 이후일 수 없습니다." };
  }
  return { ok: true };
}

function renderRows(list = []) {
  $rows.innerHTML = list.map(b => `
    <tr data-id="${b.id}">
      <td>${b.id ?? ""}</td>
      <td>${escapeHtml(b.title)}</td>
      <td>${escapeHtml(b.author)}</td>
      <td>${escapeHtml(b.isbn)}</td>
      <td>${b.price ?? ""}</td>
      <td>${escapeHtml(b.publishDate)}</td>
      <td>
        <div class="row-actions">
          <button data-action="edit">수정</button>
          <button data-action="delete" class="danger">삭제</button>
        </div>
      </td>
    </tr>
  `).join("");
}

async function fetchAll() {
  showInfo("");
  try {
    const res = await fetch(`${API_BASE_URL}/api/books`);
    if (!res.ok) throw new Error(`조회 실패: ${res.status}`);
    const list = await res.json();
    renderRows(list);
  } catch (err) {
    showError(err.message);
  }
}

async function createBook(bookData) {
  const v = validateStudent(bookData);
  if (!v.ok) { showError(v.message); return; }

  try {
    const res = await fetch(`${API_BASE_URL}/api/books`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookData),
    });
    if (!res.ok) throw new Error(`등록 실패: ${res.status}`);
    showSuccess("등록 성공!");
    $form.reset();
    await fetchAll();
  } catch (err) {
    showError(err.message);
  }
}

async function deleteBook(bookId) {
  if (!confirm(`ID=${bookId} 도서를 삭제할까요?`)) return;
  try {
    const res = await fetch(`${API_BASE_URL}/api/books/${bookId}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`삭제 실패: ${res.status}`);
    showSuccess("삭제 완료!");
    if (editingBookId && Number(editingBookId) === Number(bookId)) {
      toggleEditMode(false);
      $form.reset();
    }
    await fetchAll();
  } catch (err) {
    showError(err.message);
  }
}

async function editBook(bookId) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/books/${bookId}`);
    if (res.status === 404) throw new Error("해당 도서를 찾을 수 없습니다.");
    if (!res.ok) throw new Error(`조회 실패: ${res.status}`);
    const book = await res.json();

    $form.title.value       = book.title ?? "";
    $form.author.value      = book.author ?? "";
    $form.isbn.value        = book.isbn ?? "";
    $form.price.value       = book.price ?? "";
    $form.publishDate.value = book.publishDate ?? "";

    editingBookId = book.id;
    toggleEditMode(true);
    showInfo(`ID=${book.id} 도서를 수정 중입니다.`);
  } catch (err) {
    showError(err.message);
  }
}

async function updateBook(bookId, bookData) {
  const v = validateStudent(bookData);
  if (!v.ok) { showError(v.message); return; }

  try {
    const res = await fetch(`${API_BASE_URL}/api/books/${bookId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookData),
    });
    if (res.status === 404) throw new Error("수정 대상 도서를 찾을 수 없습니다.");
    if (!res.ok) throw new Error(`수정 실패: ${res.status}`);

    showSuccess("수정 완료!");
    toggleEditMode(false);
    $form.reset();
    await fetchAll();
  } catch (err) {
    showError(err.message);
  }
}

$form.addEventListener("submit", async (e) => {
  e.preventDefault();
  showInfo("");

  const fd = new FormData($form);
  const book = Object.fromEntries(fd.entries());

  if (editingBookId) {
    await updateBook(editingBookId, book);
  } else {
    await createBook(book);
  }
});

cancelButton.addEventListener("click", () => {
  toggleEditMode(false);
  $form.reset();
  showInfo("수정이 취소되었습니다.");
});

loadAllBtn.addEventListener("click", fetchAll);

$rows.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const tr = e.target.closest("tr");
  const id = tr?.dataset?.id;
  if (!id) return;

  const action = btn.dataset.action;
  if (action === "edit") {
    editBook(id);
  } else if (action === "delete") {
    deleteBook(id);
  }
});


fetchAll();