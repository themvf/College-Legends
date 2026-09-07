import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { EnterpriseGame } from './EnterpriseGame.js';
import { ENTERPRISE_KEY, restoreEnterprise } from './enterprise.js';
beforeEach(()=>{localStorage.clear();vi.stubGlobal('matchMedia',()=>({matches:false}));HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};});
it('opens with one business decision and saves its actual receipts',()=>{
 render(<EnterpriseGame/>);expect(screen.getByRole('heading',{name:/Give them a reason/})).toBeInTheDocument();
 expect(screen.queryByRole('navigation')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:/Call our regulars/}));
 expect(screen.getByRole('heading',{name:'The first commitments are in.'})).toBeInTheDocument();
 expect(restoreEnterprise(localStorage.getItem(ENTERPRISE_KEY)!).stage).toBe('campaign-report');
});
it('lets the player pause campus animation and inspect inherited operations',()=>{
 const {container}=render(<EnterpriseGame/>);fireEvent.click(screen.getByRole('button',{name:'Pause motion'}));
 expect(container.querySelector('.campus-world')).toHaveClass('paused');
 fireEvent.click(screen.getByRole('button',{name:/Ticket office/}));
 expect(screen.getByText(/Mara Chen leads/)).toBeInTheDocument();
});
it('keeps damaged data recoverable and does not touch earlier careers',()=>{
 localStorage.setItem(ENTERPRISE_KEY,'broken');localStorage.setItem('college-legends-business-v1','old');
 render(<EnterpriseGame/>);fireEvent.click(screen.getByRole('button',{name:/Call our regulars/}));
 expect(localStorage.getItem(ENTERPRISE_KEY+'-recovery')).toBe('broken');expect(localStorage.getItem('college-legends-business-v1')).toBe('old');
});
