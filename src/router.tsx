import { createHashRouter } from 'react-router-dom';
import Layout from './components/Layout';
import Bookshelf from './pages/Bookshelf';
import BookDetail from './pages/BookDetail';
import BookSources from './pages/BookSources';
import BookSourceImport from './pages/BookSourceImport';
import BookSourceEditor from './pages/BookSourceEditor';
import BookSourceDebug from './pages/BookSourceDebug';
import Search from './pages/Search';
import Settings from './pages/Settings';
import Reader from './pages/Reader';
import RssArticleList from './pages/RssArticleList';
import RssArticleViewer from './pages/RssArticleViewer';
import Explore from './pages/Explore';
import ReplaceRules from './pages/ReplaceRules';

export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Bookshelf /> },
      { path: 'book/:bookUrl', element: <BookDetail /> },
      { path: 'sources', element: <BookSources /> },
      { path: 'sources/import', element: <BookSourceImport /> },
      { path: 'sources/new', element: <BookSourceEditor /> },
      { path: 'sources/edit/:bookSourceUrl', element: <BookSourceEditor /> },
      { path: 'sources/debug/:bookSourceUrl', element: <BookSourceDebug /> },
      { path: 'search', element: <Search /> },
      { path: 'explore', element: <Explore /> },
      { path: 'settings', element: <Settings /> },
      { path: 'replace-rules', element: <ReplaceRules /> },
    ],
  },
  { path: '/reader/:bookUrl', element: <Reader /> },
  { path: '/rss/:sourceUrl', element: <RssArticleList /> },
  { path: '/rss/article', element: <RssArticleViewer /> },
]);
