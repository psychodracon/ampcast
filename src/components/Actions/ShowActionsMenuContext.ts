import {createContext} from 'react';
import {showActionsMenu} from './ActionsMenu';

const ShowActionsMenuContext = createContext<typeof showActionsMenu<any>>(showActionsMenu);

export default ShowActionsMenuContext;
