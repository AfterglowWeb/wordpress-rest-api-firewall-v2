import {
	createContext,
	useContext,
	useState,
	useCallback,
	type PropsWithChildren,
} from 'react';

export type AdminData = Record<string, any>;

export type AdminDataContextValue = {
	adminData: AdminData;
	setAdminData: (data: AdminData) => void;
	updateAdminData: (partial: Partial<AdminData>) => void;
};

const AdminDataContext = createContext<AdminDataContextValue | undefined>(undefined);

type AdminDataProviderProps = PropsWithChildren<{
	adminData?: AdminData;
}>;

export const AdminDataProvider = ({
	children,
	adminData: initialAdminData = {},
}: AdminDataProviderProps): JSX.Element => {
	const [adminData, setAdminData] = useState<AdminData>(initialAdminData);

	const replaceAdminData = useCallback((nextData?: AdminData) => {
		setAdminData(nextData ?? {});
	}, []);

	const updateAdminData = useCallback((partial?: Partial<AdminData>) => {
		if (!partial || typeof partial !== 'object') {
			return;
		}

		setAdminData((prev) => ({
			...prev,
			...partial,
		}));
	}, []);

	const value: AdminDataContextValue = {
		adminData,
		setAdminData: replaceAdminData,
		updateAdminData,
	};

	return (
		<AdminDataContext.Provider value={value}>
			{children}
		</AdminDataContext.Provider>
	);
};

export const useAdminData = (): AdminDataContextValue => {
	const context = useContext(AdminDataContext);

	if (!context) {
		throw new Error('useAdminData must be used within AdminDataProvider');
	}

	return context;
};