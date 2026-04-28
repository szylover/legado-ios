import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookDao } from '@/data/dao/BookDao';
import type { Book } from '@/data/entities/Book';

export default function Bookshelf() {
  const navigate = useNavigate();
  const books = useLiveQuery(() => BookDao.getAll(), []);

  if (!books) return null;

  return (
    <div>
      <div className="page-hdr">
        <h1>书架</h1>
        <button onClick={() => navigate('/search')} style={{ color: 'var(--accent)', fontSize: 14 }}>搜索</button>
      </div>

      {books.length === 0 ? (
        <div className="empty">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <p>书架空空如也<br />去搜索添加书籍，或先导入书源</p>
          <button className="btn btn-primary" onClick={() => navigate('/sources')}>管理书源</button>
        </div>
      ) : (
        <div className="book-grid">
          {books.map(book => (
            <BookCard key={book.bookUrl} book={book}
              onClick={() => navigate(`/reader/${encodeURIComponent(book.bookUrl)}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

function BookCard({ book, onClick }: { book: Book; onClick: () => void }) {
  return (
    <div className="book-card" onClick={onClick}>
      <div className="book-cover">
        {book.coverUrl
          ? <img src={book.coverUrl} alt={book.name} loading="lazy" />
          : <div className="book-cover-ph">📖</div>}
      </div>
      <div className="book-title">{book.name}</div>
      <div className="book-author">{book.author}</div>
    </div>
  );
}
