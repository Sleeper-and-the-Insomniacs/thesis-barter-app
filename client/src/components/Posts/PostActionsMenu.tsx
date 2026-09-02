import React, { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FlagIcon from '@mui/icons-material/Flag';
import PersonOffIcon from '@mui/icons-material/PersonOff';

interface PostActionsMenuProps {
  onReport: () => void;
  onBlock?: () => void;
  blocked?: boolean;
  showBlock?: boolean;
  showReport?: boolean;
  showManage?: boolean;
  onEdit?: () => void;
  onDeletePost?: () => void;
}

export default function PostActionsMenu({
  onReport, onBlock, blocked = false, showBlock = false, showReport = true,
  showManage = false, onEdit, onDeletePost,
}: PostActionsMenuProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  if (!showReport && !showBlock && !showManage) return null;

  return (
    <>
      <IconButton size="small" onClick={handleOpen}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={handleClose}>
        {showManage && (
        <MenuItem onClick={() => { onEdit?.(); handleClose(); }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit
        </MenuItem>
        )}
        {showManage && (
        <MenuItem onClick={() => { onDeletePost?.(); handleClose(); }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          Delete
        </MenuItem>
        )}
        {showReport && (
        <MenuItem onClick={() => { onReport(); handleClose(); }}>
          <ListItemIcon>
            <FlagIcon fontSize="small" />
          </ListItemIcon>
          Report post
        </MenuItem>
        )}
        {showBlock && (
        <MenuItem onClick={() => { onBlock?.(); handleClose(); }}>
          <ListItemIcon>
            {blocked ? (
              <PersonOffIcon fontSize="small" />
            ) : (
              <PersonOffIcon fontSize="small" />
            )}
          </ListItemIcon>
          {blocked ? 'Unblock user' : 'Block user'}
        </MenuItem>
        )}
      </Menu>
    </>
  );
}
