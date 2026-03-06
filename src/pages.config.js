/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Administration from './pages/Administration';
import Articles from './pages/Articles';
import Communication from './pages/Communication';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Expenses from './pages/Expenses';
import Finance from './pages/Finance';
import NonConformities from './pages/NonConformities';
import Personnel from './pages/Personnel';
import Plans from './pages/Plans';
import ProjectDetails from './pages/ProjectDetails';
import Projects from './pages/Projects';
import Reporting from './pages/Reporting';
import Stock from './pages/Stock';
import TaskDetails from './pages/TaskDetails';
import Tasks from './pages/Tasks';
import Tools from './pages/Tools';
import Reception from './pages/Reception';
import Subcontractors from './pages/Subcontractors';
import Attachments from './pages/Attachments';
import Invoices from './pages/Invoices';
import PurchaseOrders from './pages/PurchaseOrders';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Administration": Administration,
    "Articles": Articles,
    "Communication": Communication,
    "Dashboard": Dashboard,
    "Documents": Documents,
    "Expenses": Expenses,
    "Finance": Finance,
    "NonConformities": NonConformities,
    "Personnel": Personnel,
    "Plans": Plans,
    "ProjectDetails": ProjectDetails,
    "Projects": Projects,
    "Reporting": Reporting,
    "Stock": Stock,
    "TaskDetails": TaskDetails,
    "Tasks": Tasks,
    "Tools": Tools,
    "Reception": Reception,
    "Subcontractors": Subcontractors,
    "Attachments": Attachments,
    "Invoices": Invoices,
    "PurchaseOrders": PurchaseOrders,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};