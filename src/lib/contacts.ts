export interface GoogleContactPerson {
  resourceName: string;
  etag: string;
  displayName: string;
  givenName?: string;
  familyName?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  company?: string;
  jobTitle?: string;
  address?: string;
  notes?: string;
}

export interface GoogleContactInput {
  givenName: string;
  familyName?: string;
  phone?: string;
  email?: string;
  company?: string;
  jobTitle?: string;
  notes?: string;
  address?: string;
}

/**
 * Parses raw People API Person item into a clean GoogleContactPerson.
 */
function parsePerson(person: any): GoogleContactPerson {
  const resourceName = person.resourceName || '';
  const etag = person.etag || '';
  
  const nameObj = person.names?.[0];
  const displayName = nameObj?.displayName || 
    [nameObj?.givenName, nameObj?.familyName].filter(Boolean).join(' ') || 
    person.emailAddresses?.[0]?.value || 
    person.phoneNumbers?.[0]?.value || 
    'Unnamed Contact';
  
  const givenName = nameObj?.givenName || '';
  const familyName = nameObj?.familyName || '';
  
  const email = person.emailAddresses?.[0]?.value || '';
  const phone = person.phoneNumbers?.[0]?.value || '';
  const photoUrl = person.photos?.[0]?.url || '';
  
  const org = person.organizations?.[0];
  const company = org?.name || '';
  const jobTitle = org?.title || '';
  
  const addrObj = person.addresses?.[0];
  const address = addrObj?.formattedValue || 
    [addrObj?.streetAddress, addrObj?.city, addrObj?.country].filter(Boolean).join(', ') || '';
    
  const notes = person.biographies?.[0]?.value || '';

  return {
    resourceName,
    etag,
    displayName,
    givenName,
    familyName,
    email,
    phone,
    photoUrl,
    company,
    jobTitle,
    address,
    notes,
  };
}

/**
 * Fetches the user's Google Contacts list via People API.
 */
export async function fetchGoogleContacts(accessToken: string, pageSize: number = 250): Promise<GoogleContactPerson[]> {
  const url = `https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,photos,organizations,addresses,biographies&pageSize=${pageSize}&sortOrder=LAST_MODIFIED_DESCENDING`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Contacts error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const connections = data.connections || [];
  return connections.map(parsePerson);
}

/**
 * Searches user contacts using People API.
 */
export async function searchGoogleContacts(accessToken: string, query: string): Promise<GoogleContactPerson[]> {
  if (!query.trim()) {
    return fetchGoogleContacts(accessToken);
  }

  const url = `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(query)}&readMask=names,emailAddresses,phoneNumbers,photos,organizations,addresses,biographies&pageSize=50`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    // Fallback to client-side filtering if search endpoint requires specific index
    console.warn('Search contacts API warning, falling back to connection list:', errText);
    const all = await fetchGoogleContacts(accessToken);
    const q = query.toLowerCase();
    return all.filter(c => 
      c.displayName.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.company && c.company.toLowerCase().includes(q))
    );
  }

  const data = await response.json();
  const results = data.results || [];
  return results.map((r: any) => parsePerson(r.person));
}

/**
 * Creates a new Contact in Google Contacts.
 */
export async function createGoogleContact(
  accessToken: string, 
  contact: GoogleContactInput
): Promise<GoogleContactPerson> {
  const body: any = {
    names: [
      {
        givenName: contact.givenName,
        familyName: contact.familyName || '',
      }
    ],
  };

  if (contact.phone) {
    body.phoneNumbers = [{ value: contact.phone, type: 'mobile' }];
  }

  if (contact.email) {
    body.emailAddresses = [{ value: contact.email, type: 'work' }];
  }

  if (contact.company || contact.jobTitle) {
    body.organizations = [
      {
        name: contact.company || '',
        title: contact.jobTitle || '',
      }
    ];
  }

  if (contact.address) {
    body.addresses = [{ formattedValue: contact.address, type: 'work' }];
  }

  if (contact.notes) {
    body.biographies = [{ value: contact.notes, contentType: 'TEXT_PLAIN' }];
  }

  const response = await fetch('https://people.googleapis.com/v1/people:createContact', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create Google Contact: ${errText}`);
  }

  const data = await response.json();
  return parsePerson(data);
}

/**
 * Updates an existing Google Contact.
 */
export async function updateGoogleContact(
  accessToken: string,
  resourceName: string,
  etag: string,
  contact: GoogleContactInput
): Promise<GoogleContactPerson> {
  const body: any = {
    etag,
    names: [
      {
        givenName: contact.givenName,
        familyName: contact.familyName || '',
      }
    ],
  };

  const updatePersonFields: string[] = ['names'];

  if (contact.phone) {
    body.phoneNumbers = [{ value: contact.phone, type: 'mobile' }];
    updatePersonFields.push('phoneNumbers');
  }

  if (contact.email) {
    body.emailAddresses = [{ value: contact.email, type: 'work' }];
    updatePersonFields.push('emailAddresses');
  }

  if (contact.company || contact.jobTitle) {
    body.organizations = [
      {
        name: contact.company || '',
        title: contact.jobTitle || '',
      }
    ];
    updatePersonFields.push('organizations');
  }

  if (contact.address) {
    body.addresses = [{ formattedValue: contact.address, type: 'work' }];
    updatePersonFields.push('addresses');
  }

  if (contact.notes) {
    body.biographies = [{ value: contact.notes, contentType: 'TEXT_PLAIN' }];
    updatePersonFields.push('biographies');
  }

  const url = `https://people.googleapis.com/v1/${resourceName}:updateContact?updatePersonFields=${updatePersonFields.join(',')}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to update Google Contact: ${errText}`);
  }

  const data = await response.json();
  return parsePerson(data);
}

/**
 * Deletes a Google Contact (Destructive Operation).
 */
export async function deleteGoogleContact(
  accessToken: string,
  resourceName: string
): Promise<void> {
  const url = `https://people.googleapis.com/v1/${resourceName}:deleteContact`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to delete Google Contact: ${errText}`);
  }
}
