import { createHashRouter } from 'react-router-dom';
import Layout from './components/Layout';
import Bookshelf from './pages/Bookshelf';
import BookSources from './pages/BookSources';
import BookSourceImport from './pages/BookSourceImport';
import Search from './pages/Search';
import Settings from './pages/Settings';
import Reader from './pages/Reader';
import RssArticleList from './pages/RssArticleList';
import RssArticleViewer from './pages/RssArticleViewer';

export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Bookshelf /> },
      { path: 'sources', element: <BookSources /> },
      { path: 'sources/import', element: <BookSourceImport /> },
      { path: 'search', element: <Search /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
  { path: '/reader/:bookUrl', element: <Reader /> },
  { path: '/rss/:sourceUrl', element: <RssArticleList /> },
  { path: '/rss/article', element: <RssArticleViewer /> },
]);
