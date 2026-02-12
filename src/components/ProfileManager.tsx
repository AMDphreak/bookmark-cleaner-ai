import { Component, createSignal, For } from 'solid-js';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from '@suid/material';
import DeleteIcon from '@suid/icons-material/Delete';
import { BookmarkProfile } from '../types';

interface ProfileManagerProps {
  profiles: BookmarkProfile[];
  onAddProfile: (profile: BookmarkProfile) => void;
  onDeleteProfile: (id: string) => void;
  onMapProfile: (profileId: string, mappedTo: string) => void;
}

const ProfileManager: Component<ProfileManagerProps> = (props) => {
  const [open, setOpen] = createSignal(false);
  const [name, setName] = createSignal('');
  const [browser, setBrowser] = createSignal<'firefox' | 'chrome' | 'edge'>('firefox');
  const [profilePath, setProfilePath] = createSignal('');
  const [apiEnabled, setApiEnabled] = createSignal(false);
  const [apiToken, setApiToken] = createSignal('');

  function handleAdd() {
    const profile: BookmarkProfile = {
      id: `${Date.now()}`,
      name: name(),
      browser: browser(),
      profilePath: profilePath() || undefined,
      apiEnabled: apiEnabled(),
      apiToken: apiToken() || undefined,
    };

    props.onAddProfile(profile);
    setOpen(false);
    setName('');
    setProfilePath('');
    setApiToken('');
    setApiEnabled(false);
  }

  return (
    <Box>
      <Button variant="contained" onClick={() => setOpen(true)}>
        Add Profile
      </Button>

      <List>
        <For each={props.profiles}>
          {(profile) => (
            <ListItem>
              <ListItemText
                primary={profile.name}
                secondary={`${profile.browser} - ${profile.profilePath || 'API'}`}
              />
              <FormControl size="small" sx={{ minWidth: 200, mr: 2 }}>
                <InputLabel>Map to Profile</InputLabel>
                <Select
                  value={profile.mappedTo || ''}
                  onChange={(e) => props.onMapProfile(profile.id, e.target.value)}
                  label="Map to Profile"
                >
                  <MenuItem value="">None</MenuItem>
                  <For each={props.profiles.filter((p) => p.id !== profile.id)}>
                    {(p) => <MenuItem value={p.id}>{p.name}</MenuItem>}
                  </For>
                </Select>
              </FormControl>
              <IconButton onClick={() => props.onDeleteProfile(profile.id)}>
                <DeleteIcon />
              </IconButton>
            </ListItem>
          )}
        </For>
      </List>

      <Dialog open={open()} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Bookmark Profile</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Profile Name"
              value={name()}
              onChange={(e) => setName(e.target.value)}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Browser</InputLabel>
              <Select
                value={browser()}
                onChange={(e) => setBrowser(e.target.value as any)}
                label="Browser"
              >
                <MenuItem value="firefox">Firefox</MenuItem>
                <MenuItem value="chrome">Chrome</MenuItem>
                <MenuItem value="edge">Microsoft Edge</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Profile Path (optional if using API)"
              value={profilePath()}
              onChange={(e) => setProfilePath(e.target.value)}
              fullWidth
              helperText="Leave empty if using API connection"
            />
            <FormControl>
              <InputLabel>Use API</InputLabel>
              <Select
                value={apiEnabled() ? 'yes' : 'no'}
                onChange={(e) => setApiEnabled(e.target.value === 'yes')}
                label="Use API"
              >
                <MenuItem value="no">No (Local Files)</MenuItem>
                <MenuItem value="yes">Yes (API)</MenuItem>
              </Select>
            </FormControl>
            {apiEnabled() && (
              <TextField
                label="API Token"
                type="password"
                value={apiToken()}
                onChange={(e) => setApiToken(e.target.value)}
                fullWidth
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfileManager;

