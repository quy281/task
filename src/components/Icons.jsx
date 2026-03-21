/**
 * SVG Icon components — replaces emoji icons per ui-ux-pro-max skill.
 * Uses inline SVGs for zero-dependency, crisp rendering.
 * Based on Lucide icon set style (24x24 viewBox, stroke-based).
 */

const iconStyle = { width: '1em', height: '1em', verticalAlign: '-0.125em', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function IconSearch(props) {
    return <svg {...iconStyle} viewBox="0 0 24 24" {...props}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>;
}

export function IconPlus(props) {
    return <svg {...iconStyle} viewBox="0 0 24 24" {...props}><path d="M5 12h14" /><path d="M12 5v14" /></svg>;
}

export function IconBell(props) {
    return <svg {...iconStyle} viewBox="0 0 24 24" {...props}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>;
}

export function IconSettings(props) {
    return <svg {...iconStyle} viewBox="0 0 24 24" {...props}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>;
}

export function IconLogout(props) {
    return <svg {...iconStyle} viewBox="0 0 24 24" {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
}

export function IconClipboard(props) {
    return <svg {...iconStyle} viewBox="0 0 24 24" {...props}><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></svg>;
}

export function IconUser(props) {
    return <svg {...iconStyle} viewBox="0 0 24 24" {...props}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}

export function IconSend(props) {
    return <svg {...iconStyle} viewBox="0 0 24 24" {...props}><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>;
}

export function IconAlertCircle(props) {
    return <svg {...iconStyle} viewBox="0 0 24 24" style={{ ...iconStyle, stroke: '#ef4444', ...props?.style }} {...props}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
}

export function IconArchive(props) {
    return <svg {...iconStyle} viewBox="0 0 24 24" {...props}><rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></svg>;
}

export function IconTag(props) {
    return <svg {...iconStyle} viewBox="0 0 24 24" {...props}><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /><circle cx="7.5" cy="7.5" r=".5" fill="currentColor" /></svg>;
}

export function IconTrash(props) {
    return <svg {...iconStyle} viewBox="0 0 24 24" {...props}><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>;
}

export function IconEdit(props) {
    return <svg {...iconStyle} viewBox="0 0 24 24" {...props}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>;
}

export function IconX(props) {
    return <svg {...iconStyle} viewBox="0 0 24 24" {...props}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>;
}

export function IconCheck(props) {
    return <svg {...iconStyle} viewBox="0 0 24 24" {...props}><path d="M20 6 9 17l-5-5" /></svg>;
}

export function IconUsers(props) {
    return <svg {...iconStyle} viewBox="0 0 24 24" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}

export function IconBuilding(props) {
    return <svg {...iconStyle} viewBox="0 0 24 24" {...props}><rect width="16" height="20" x="4" y="2" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" /></svg>;
}

export function IconCalendar(props) {
    return <svg {...iconStyle} viewBox="0 0 24 24" {...props}><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></svg>;
}

export function IconMessageCircle(props) {
    return <svg {...iconStyle} viewBox="0 0 24 24" {...props}><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>;
}

export function IconZap(props) {
    return <svg {...iconStyle} viewBox="0 0 24 24" {...props}><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" /></svg>;
}

export function IconMenu(props) {
    return <svg {...iconStyle} viewBox="0 0 24 24" {...props}><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>;
}

export function IconGrid(props) {
    return <svg {...iconStyle} viewBox="0 0 24 24" {...props}><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></svg>;
}

export function IconList(props) {
    return <svg {...iconStyle} viewBox="0 0 24 24" {...props}><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></svg>;
}

// Department/team icons (replacing random emoji icons)
const DEPT_ICONS = {
    'Đội thợ 1': IconSettings,
    'Đội thợ 2': IconSettings,
    'Phòng thiết kế': IconEdit,
    'Phòng kinh doanh': IconSend,
    'Phòng marketing': IconZap,
    'Ban giám đốc': IconBuilding,
};

export function getDeptIcon(deptName) {
    return DEPT_ICONS[deptName] || IconTag;
}
