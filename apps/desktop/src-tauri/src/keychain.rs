use keyring::Entry;

const SERVICE_NAME: &str = "com.mgnode.app";

pub fn save_token(provider: &str, username: &str, token: &str) -> Result<(), String> {
    let account = format!("{}:{}", provider, username);
    let entry = Entry::new(SERVICE_NAME, &account).map_err(|e| e.to_string())?;
    entry.set_password(token).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_token(provider: &str, username: &str) -> Result<Option<String>, String> {
    let account = format!("{}:{}", provider, username);
    let entry = Entry::new(SERVICE_NAME, &account).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(pass) => Ok(Some(pass)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

pub fn delete_token(provider: &str, username: &str) -> Result<(), String> {
    let account = format!("{}:{}", provider, username);
    let entry = Entry::new(SERVICE_NAME, &account).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keychain_save_and_get() {
        save_token("test-provider", "test-user", "test-secret-123").unwrap();
        let read = get_token("test-provider", "test-user").unwrap();
        assert_eq!(read, Some("test-secret-123".to_string()));
        delete_token("test-provider", "test-user").unwrap();
        let after_delete = get_token("test-provider", "test-user").unwrap();
        assert_eq!(after_delete, None);
    }
}

